# Google Sheets Integration Spec

## Overview
Replace the in-memory `MemStorage` in `server/storage.ts` with a `SheetsStorage` class that reads data from Google Sheets via the `external-tool` CLI. The frontend stays unchanged — only the backend data source changes.

## Architecture

### How it works
1. The Express backend uses `external-tool call '...'` CLI to fetch data from Google Sheets
2. Data is cached in-memory for 60 seconds to avoid hitting Sheets API on every request
3. KPIs, daily summaries, and trends are computed server-side from the raw sheet data (same logic as before)
4. The `IStorage` interface stays exactly the same — only the implementation changes

### Spreadsheet Details
- **ID**: `1ff_2bh51P10poKZFJt3KBB2nnKBQKwi8ChE4-e4WB90`
- Config at: `sheets-config.json` (has spreadsheetId and worksheet IDs)

### Worksheet IDs (numeric, for the API)
```
ward_master:  1879295313
bed_status:   1371725973
admissions:   273488779
discharges:   1342657738
transfers:    1864963890
staffing:     1196915151
incidents:    2041619715
supplies:     2039380017
```

### Column mappings per worksheet

**ward_master**: ward_code, ward_name, hospital, specialty, total_beds, manager, active
**bed_status**: bed_id, ward_code, bed_status, patient_ref_id, last_updated
**admissions**: record_id, event_timestamp, event_date, shift_code, ward_code, patient_ref_id, admission_source, admission_type, bed_id, priority
**discharges**: record_id, event_timestamp, event_date, shift_code, ward_code, patient_ref_id, bed_id, destination, delay_flag, delay_reason
**transfers**: record_id, event_timestamp, event_date, source_ward_code, dest_ward_code, patient_ref_id, status, reason
**staffing**: record_id, event_date, shift_code, ward_code, planned_nurses, actual_nurses, nursing_assistants, agency_staff, absent_count, physician_coverage, risk_flag
**incidents**: record_id, event_timestamp, event_date, shift_code, ward_code, incident_type, severity, escalation_required, status, summary, responsible_team
**supplies**: record_id, event_timestamp, event_date, ward_code, item_category, item_description, urgency, quantity_needed, status

## Implementation: `server/storage.ts`

### External Tool CLI Pattern
```typescript
import { execSync } from "child_process";

function callTool(sourceId: string, toolName: string, args: Record<string, any>): any {
  const params = JSON.stringify({ source_id: sourceId, tool_name: toolName, arguments: args });
  const result = execSync(`external-tool call '${params}'`).toString();
  return JSON.parse(result);
}
```

### Fetching sheet data
Use `google_sheets-get-values-in-range` tool:
```typescript
const result = callTool("google_sheets__pipedream", "google_sheets-get-values-in-range", {
  sheetId: "1ff_2bh51P10poKZFJt3KBB2nnKBQKwi8ChE4-e4WB90",
  worksheetId: 1879295313,  // ward_master worksheet ID (NUMBER, not string)
});
```

**IMPORTANT**: The result from this tool is DIRECTLY an array of arrays. First row is headers, subsequent rows are data. There is NO wrapper object.

The response shape is:
```json
[
  ["ward_code", "ward_name", "hospital", "specialty", "total_beds", "manager", "active"],
  ["ONCO", "אונקולוגיה", "Soroka Medical Center", "Oncology", "30", "Dr. A. Cohen", "TRUE"],
  ["URO", "אורולוגיה", "Soroka Medical Center", "Urology", "24", "Dr. B. Levy", "TRUE"],
  ...
]
```

So `callTool(...)` returns `string[][]` directly. Parse it as: `const rows: string[][] = callTool(...)`.

### Caching Strategy
```typescript
class SheetsStorage implements IStorage {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_TTL = 60000; // 60 seconds

  private getCachedOrFetch<T>(key: string, fetchFn: () => T): T {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    const data = fetchFn();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }
}
```

### Row-to-Object Mapping
Parse each row using column headers:
```typescript
function rowsToObjects<T>(values: string[][]): T[] {
  if (!values || values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj: any = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj;
  });
}
```

Then convert column names from snake_case to camelCase to match the TypeScript types. For example:
- `ward_code` → `wardCode`
- `total_beds` → `totalBeds` (parse as integer)
- `delay_flag` → `delayFlag` (parse "TRUE"/"FALSE" to boolean)
- `risk_flag` → `riskFlag` (parse "TRUE"/"FALSE" to boolean)
- Numeric fields (planned_nurses, actual_nurses, etc.) → parseInt
- Float fields (occupancy_rate, etc.) → parseFloat

### KPI Computation
The KPIs, daily summaries, and trends are NOT stored in sheets — they are computed server-side from the raw data, exactly like the current `generateKpiCurrent()`, `generateDailySummaries()`, and trend methods. Copy that logic from the current `MemStorage`.

### Fallback
If the Google Sheets API call fails (e.g., network error, auth expired), fall back to empty arrays rather than crashing the app. Log errors to console.

## Changes Needed

### File: `server/storage.ts`
- Replace `MemStorage` class with `SheetsStorage` class
- Keep the `IStorage` interface unchanged
- Keep the WARDS constant as a fallback
- Add the `callTool` helper function
- Add caching layer
- Add row-to-object mapping with type conversions
- Compute KPIs/summaries/trends from fetched data
- Export `storage` as `new SheetsStorage()`

### File: `server/routes.ts`  
- No changes needed — it already uses the storage interface

### File: `shared/schema.ts`
- No changes needed

### Frontend
- No changes needed — all data comes from the same API endpoints

## CRITICAL Notes
1. The `external-tool` CLI requires the `api_credentials=["external-tools"]` environment. The server must be started with this credential preset.
2. worksheetId must be passed as a NUMBER (integer), not a string
3. Boolean fields in sheets are stored as "TRUE"/"FALSE" strings — convert them
4. Numeric fields are stored as strings in sheets — parseInt/parseFloat them
5. The `id` field in each type is auto-generated (serial) — assign incrementing IDs when mapping rows
6. Keep the old `MemStorage` code commented out or in a separate file as fallback reference
