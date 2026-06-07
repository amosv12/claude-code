#!/usr/bin/env python3
"""
Shift-end data processor for Clalit Ward Operations Dashboard.

Reads new form responses from the Google Sheet, processes each ward snapshot,
and writes computed data into the granular sheets (bed_status, staffing,
admissions, discharges, incidents, supplies).

Designed to run as a scheduled task every 8 hours (shift change).
"""

import asyncio
import json
import sys
from datetime import datetime, timezone

# --- Config ---
SHEET_ID = "1ff_2bh51P10poKZFJt3KBB2nnKBQKwi8ChE4-e4WB90"
WS = {
    "ward_master": 1879295313,
    "bed_status": 1371725973,
    "admissions": 273488779,
    "discharges": 1342657738,
    "staffing": 1196915151,
    "incidents": 2041619715,
    "supplies": 2039380017,
    "form_responses": 1902137677,
}

SOURCE_ID = "google_sheets__pipedream"

# Shift mapping from Hebrew
SHIFT_MAP = {"בוקר": "day", "ערב": "evening", "לילה": "night"}
COVERAGE_MAP = {"מלא": "full", "חלקי": "partial", "אין": "none"}


async def call_tool(tool_name, arguments):
    """Call an external tool via the CLI."""
    params = json.dumps({
        "source_id": SOURCE_ID,
        "tool_name": tool_name,
        "arguments": arguments,
    })
    proc = await asyncio.create_subprocess_exec(
        "external-tool", "call", params,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"Tool error: {stderr.decode()}")
    return json.loads(stdout.decode())


async def fetch_sheet(worksheet_id, range_str=None):
    """Fetch all values from a worksheet."""
    args = {"sheetId": SHEET_ID, "worksheetId": worksheet_id}
    if range_str:
        args["range"] = range_str
    return await call_tool("google_sheets-get-values-in-range", args)


async def upsert_row(worksheet_id, column, value, insert_data, update_data=None):
    """Upsert a row: insert if key doesn't exist, update if it does."""
    args = {
        "sheetId": SHEET_ID,
        "worksheetId": worksheet_id,
        "column": column,
        "value": value,
        "insert": insert_data,
    }
    if update_data:
        args["updates"] = update_data
    return await call_tool("google_sheets-upsert-row", args)


async def add_row(worksheet_id, row_data):
    """Append a row to a worksheet."""
    args = {
        "sheetId": SHEET_ID,
        "worksheetId": worksheet_id,
        "hasHeaders": True,
        "insert": row_data,
    }
    # Use upsert with a unique key to effectively append
    return await call_tool("google_sheets-add-single-row", {
        "sheetId": SHEET_ID,
        "worksheetId": worksheet_id,
        "hasHeaders": True,
    })


def rows_to_dicts(values):
    """Convert sheet values (list of lists) to list of dicts."""
    if not values or len(values) < 2:
        return []
    headers = values[0]
    return [
        {headers[i]: (row[i] if i < len(row) else "") for i in range(len(headers))}
        for row in values[1:]
    ]


def normalize_date(date_str):
    """Normalize date formats to yyyy-mm-dd."""
    if not date_str:
        return ""
    date_str = date_str.strip()
    # Already yyyy-mm-dd
    if len(date_str) == 10 and date_str[4] == "-":
        return date_str
    # dd/mm/yyyy
    parts = date_str.split("/")
    if len(parts) == 3:
        d, m, y = parts
        if len(y) == 4:
            return f"{y}-{m.zfill(2)}-{d.zfill(2)}"
    # Try parsing
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d")
    except Exception:
        pass
    return date_str


def safe_int(val):
    """Parse integer safely."""
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return 0


async def fetch_ward_master():
    """Fetch ward master data."""
    values = await fetch_sheet(WS["ward_master"])
    return rows_to_dicts(values)


async def fetch_form_responses():
    """Fetch all form responses."""
    values = await fetch_sheet(WS["form_responses"])
    return rows_to_dicts(values)


async def fetch_processed_tracker():
    """
    Check which form responses have already been processed.
    We track this by looking at the 'last_updated' timestamps in bed_status.
    """
    values = await fetch_sheet(WS["bed_status"])
    return rows_to_dicts(values)


def get_latest_snapshots(form_rows):
    """
    For each ward, get the latest form submission.
    If multiple submissions exist for the same ward+date+shift, take the newest.
    """
    latest = {}
    for row in form_rows:
        ward_code = row.get("קוד מחלקה", "").strip()
        timestamp = row.get("חותמת זמן", row.get("Timestamp", "")).strip()
        if not ward_code:
            continue

        key = ward_code
        if key not in latest or timestamp > latest[key].get("חותמת זמן", ""):
            latest[key] = row

    return latest


async def process_bed_status(ward_code, total_beds, snapshot, now_iso):
    """
    Update bed_status rows for a ward based on form snapshot.
    Creates/updates individual bed records to match the snapshot counts.
    """
    occupied = safe_int(snapshot.get("מיטות תפוסות", 0))
    available = safe_int(snapshot.get("מיטות פנויות", 0))
    blocked = safe_int(snapshot.get("מיטות חסומות", 0))
    cleaning = safe_int(snapshot.get("מיטות בניקוי", 0))
    isolation = safe_int(snapshot.get("מיטות בידוד", 0))
    maintenance = safe_int(snapshot.get("מיטות תחזוקה", 0))

    # Build bed assignments
    statuses = (
        ["occupied"] * occupied +
        ["available"] * available +
        ["blocked"] * blocked +
        ["cleaning"] * cleaning +
        ["isolation"] * isolation +
        ["maintenance"] * maintenance
    )

    # Pad or trim to match total_beds
    while len(statuses) < total_beds:
        statuses.append("available")
    statuses = statuses[:total_beds]

    # Upsert each bed
    for i, status in enumerate(statuses):
        bed_id = f"{ward_code}-B{str(i+1).zfill(3)}"
        patient_ref = f"PAT-{abs(hash(bed_id + now_iso)) % 100000}" if status == "occupied" else ""

        await upsert_row(
            WS["bed_status"],
            column="A",  # bed_id column
            value=bed_id,
            insert_data=[bed_id, ward_code, status, patient_ref, now_iso],
            update_data={"C": status, "D": patient_ref, "E": now_iso},
        )

    return occupied, available


async def process_staffing(ward_code, snapshot, event_date):
    """Write/update staffing record for this ward+date+shift."""
    shift_heb = snapshot.get("משמרת", "בוקר").strip()
    shift_code = SHIFT_MAP.get(shift_heb, "day")
    record_id = f"STF-{event_date}-{ward_code}-{shift_code}"

    planned = snapshot.get("אחיות מתוכננות", "0")
    actual = snapshot.get("אחיות בפועל", "0")
    coverage_heb = snapshot.get("סיכוי רופאים", "מלא").strip()
    coverage = COVERAGE_MAP.get(coverage_heb, "full")

    planned_n = safe_int(planned)
    actual_n = safe_int(actual)
    absent = max(0, planned_n - actual_n)
    risk = "TRUE" if actual_n < planned_n * 0.8 else "FALSE"

    await upsert_row(
        WS["staffing"],
        column="A",  # record_id
        value=record_id,
        insert_data=[
            record_id, event_date, shift_code, ward_code,
            str(planned_n), str(actual_n), "0", "0",
            str(absent), coverage, risk
        ],
        update_data={
            "E": str(planned_n), "F": str(actual_n),
            "I": str(absent), "J": coverage, "K": risk,
        },
    )


async def process_admissions_discharges(ward_code, snapshot, event_date):
    """
    Ensure the admissions and discharges counts are reflected in the sheets.
    We create summary records per ward+date.
    """
    shift_heb = snapshot.get("משמרת", "בוקר").strip()
    shift_code = SHIFT_MAP.get(shift_heb, "day")
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    admissions_count = safe_int(snapshot.get("אשפוזים היום", 0))
    discharges_count = safe_int(snapshot.get("שחרורים היום", 0))
    delayed_count = safe_int(snapshot.get("שחרורים מעוכבים", 0))

    # Write admission records (one summary per ward+date+shift)
    for i in range(admissions_count):
        record_id = f"ADM-{event_date}-{ward_code}-{shift_code}-{i+1}"
        await upsert_row(
            WS["admissions"],
            column="A",
            value=record_id,
            insert_data=[
                record_id, now_iso, event_date, shift_code, ward_code,
                f"PAT-F{abs(hash(record_id)) % 100000}",
                "direct", "unplanned", f"{ward_code}-B{str(i+1).zfill(3)}", "routine"
            ],
        )

    # Write discharge records
    for i in range(discharges_count):
        record_id = f"DIS-{event_date}-{ward_code}-{shift_code}-{i+1}"
        is_delayed = "TRUE" if i < delayed_count else "FALSE"
        delay_reason = "גורם חיצוני" if i < delayed_count else ""

        await upsert_row(
            WS["discharges"],
            column="A",
            value=record_id,
            insert_data=[
                record_id, now_iso, event_date, shift_code, ward_code,
                f"PAT-F{abs(hash(record_id)) % 100000}",
                f"{ward_code}-B{str(i+1).zfill(3)}", "home",
                is_delayed, delay_reason
            ],
        )


async def process_incidents_supplies(ward_code, snapshot, event_date):
    """Update incident and supply shortage counts."""
    shift_heb = snapshot.get("משמרת", "בוקר").strip()
    shift_code = SHIFT_MAP.get(shift_heb, "day")
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    open_incidents = safe_int(snapshot.get("אירועים פתוחים", 0))
    open_shortages = safe_int(snapshot.get("מחסורים פתוחים", 0))
    notes = snapshot.get("הערות", "")

    # Create incident records if needed
    for i in range(open_incidents):
        record_id = f"INC-{event_date}-{ward_code}-{shift_code}-{i+1}"
        await upsert_row(
            WS["incidents"],
            column="A",
            value=record_id,
            insert_data=[
                record_id, now_iso, event_date, shift_code, ward_code,
                "other", "medium", "FALSE", "open",
                notes or "דווח בטופס משמרת", "Nursing"
            ],
        )

    # Create supply shortage records if needed
    for i in range(open_shortages):
        record_id = f"SUP-{event_date}-{ward_code}-{shift_code}-{i+1}"
        await upsert_row(
            WS["supplies"],
            column="A",
            value=record_id,
            insert_data=[
                record_id, now_iso, event_date, ward_code,
                "other", "דווח בטופס משמרת", "medium", "1", "open"
            ],
        )


async def main():
    print(f"=== Form Response Processor ===")
    print(f"Time: {datetime.now(timezone.utc).isoformat()}")
    print()

    # 1. Fetch ward master
    wards = await fetch_ward_master()
    ward_beds = {w["ward_code"]: safe_int(w["total_beds"]) for w in wards}
    print(f"Loaded {len(wards)} wards from ward_master")

    # 2. Fetch form responses
    form_rows = await fetch_form_responses()
    if not form_rows:
        print("No form responses found. Nothing to process.")
        return

    print(f"Found {len(form_rows)} total form responses")

    # 3. Get latest snapshot per ward
    latest = get_latest_snapshots(form_rows)
    print(f"Processing {len(latest)} ward snapshots")
    print()

    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    processed = 0
    errors = 0

    for ward_code, snapshot in latest.items():
        if ward_code not in ward_beds:
            print(f"  SKIP: {ward_code} - not in ward_master")
            continue

        event_date = normalize_date(
            snapshot.get("תאריך", datetime.now().strftime("%Y-%m-%d"))
        )
        total_beds = ward_beds[ward_code]

        print(f"  Processing: {ward_code} ({event_date})")

        try:
            # Update bed status
            await process_bed_status(ward_code, total_beds, snapshot, now_iso)
            print(f"    ✓ bed_status updated")

            # Update staffing
            await process_staffing(ward_code, snapshot, event_date)
            print(f"    ✓ staffing updated")

            # Update admissions & discharges
            await process_admissions_discharges(ward_code, snapshot, event_date)
            print(f"    ✓ admissions/discharges updated")

            # Update incidents & supplies
            await process_incidents_supplies(ward_code, snapshot, event_date)
            print(f"    ✓ incidents/supplies updated")

            processed += 1

        except Exception as e:
            print(f"    ✗ ERROR: {e}")
            errors += 1

    print()
    print(f"=== Done ===")
    print(f"Processed: {processed} wards")
    if errors:
        print(f"Errors: {errors}")

    return processed, errors


if __name__ == "__main__":
    result = asyncio.run(main())
    if result:
        processed, errors = result
        sys.exit(1 if errors > 0 else 0)
