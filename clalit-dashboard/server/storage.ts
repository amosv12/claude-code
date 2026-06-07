import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";
import type {
  WardMaster, FormSnapshot, WardKpi,
  Hospital, HospitalOverviewData, OverviewStats,
  BedStatusRow, AdmissionRow, DischargeRow,
  TransferRow, StaffingRow, IncidentRow, SupplyRow,
  OccupancyTrendPoint,
} from "@shared/schema";

export interface IStorage {
  getWards(): Promise<WardMaster[]>;
  getWardsByHospital(hospitalName: string): Promise<WardMaster[]>;
  getFormSnapshots(): Promise<FormSnapshot[]>;
  getWardKpis(asOfDate?: string): Promise<WardKpi[]>;
  getWardKpisByHospital(hospitalName: string, asOfDate?: string): Promise<WardKpi[]>;
  getOverviewStats(hospitalName?: string, asOfDate?: string): Promise<OverviewStats>;
  getHospitals(): Promise<Hospital[]>;
  getHospitalOverview(asOfDate?: string): Promise<HospitalOverviewData[]>;
  // Operational sheet endpoints
  getBedStatus(wardCode?: string, hospitalName?: string): Promise<BedStatusRow[]>;
  getAdmissions(wardCode?: string, dateFrom?: string): Promise<AdmissionRow[]>;
  getDischarges(wardCode?: string, dateFrom?: string): Promise<DischargeRow[]>;
  getTransfers(wardCode?: string): Promise<TransferRow[]>;
  getStaffing(wardCode?: string): Promise<StaffingRow[]>;
  getIncidents(wardCode?: string, hospitalName?: string): Promise<IncidentRow[]>;
  getSupplies(wardCode?: string): Promise<SupplyRow[]>;
  getOccupancyTrend(wardCode: string, days?: number): Promise<OccupancyTrendPoint[]>;
}

// --- Google Sheets config ---
const SHEET_ID = "1ff_2bh51P10poKZFJt3KBB2nnKBQKwi8ChE4-e4WB90";
const WORKSHEET_IDS = {
  ward_master:  1879295313,
  form_responses: 1902137677,
  bed_status:   1371725973,
  admissions:    273488779,
  discharges:  1342657738,
  transfers:   1864963890,
  staffing:    1196915151,
  incidents:   2041619715,
  supplies:    2039380017,
} as const;

// --- External tool CLI helper ---
function fetchSheet(worksheetId: number): string[][] {
  const params = JSON.stringify({
    source_id: "google_sheets__pipedream",
    tool_name: "google_sheets-get-values-in-range",
    arguments: {
      sheetId: SHEET_ID,
      worksheetId: worksheetId,
    },
  });
  const result = execFileSync("external-tool", ["call", params], {
    timeout: 30000,
    encoding: "utf-8",
  });
  return JSON.parse(result);
}

// --- Row parsing helpers ---
function rowsToRawObjects(values: string[][]): Record<string, string>[] {
  if (!values || values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (row[i] ?? "").trim();
    });
    return obj;
  });
}

function safeInt(val: string | undefined): number {
  if (!val) return 0;
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

function safeFloat(val: string | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function parseBool(val: string): boolean {
  return val.toUpperCase() === "TRUE";
}

// Normalize Hebrew text for fuzzy matching: trim, collapse spaces
function normalizeHebrew(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

// --- Ward mapper ---
function mapWard(raw: Record<string, string>, id: number): WardMaster {
  return {
    id,
    wardCode: raw["ward_code"] ?? "",
    wardName: raw["ward_name"] ?? "",
    hospital: raw["hospital"] ?? "",
    specialty: raw["specialty"] ?? "",
    totalBeds: safeInt(raw["total_beds"]),
    manager: raw["manager"] ?? "",
    active: parseBool(raw["active"] ?? "TRUE"),
  };
}

// --- Form snapshot mapper ---
const FORM_COLS = {
  timestamp: "חותמת זמן",
  institutionName: "שם המוסד",
  division: "חטיבה",
  department: "מחלקה",
  unitType: "סוג יחידה",
  standardBeds: "מספר מיטות תקן",
  occupancyPercent: "אחוז תפוסה",
  ventilatedPatients: "כמות מונשמים",
  patientsForStepDown: "מספר מטופלים לרידוד",
  patientsForRegulation: "מספר מטופלים לויסות",
  pressureSorePatients: "מספר מטופלים עם פצעי לחץ",
  fallRiskPatients: "מספר מועדים לנפילה",
  physicalAdmissions: "מספר קבלה פיזית",
  urgentPatients: "מספר מטופלים דחופים",
  nortonScore: "אומדן נורטון",
  mustScore: "אומדן מאסט",
  morseScore: "אומדן מורס",
  returningPatientsMonth: "מספר מטופלים חוזרים (חודש)",
  returningPatientsWeek: "מספר מטופלים חוזרים (שבוע)",
  returningPatientsUrgent: "מספר מטופלים חוזרים (דחוף)",
  regulationCommitteeRehab: "ועדה לויסות חולים (שיקומי)",
  regulationCommitteeChronic: "ועדה לויסות חולים (מונשם כרוני)",
  regulationCommitteeComplexNursing: "ועדה לויסות מטופלים (סיעודי מורכב)",
  isolationPatients: "מספר מטופלים לבידוד",
} as const;

function mapFormSnapshot(raw: Record<string, string>): FormSnapshot {
  return {
    timestamp: raw[FORM_COLS.timestamp] ?? raw["Timestamp"] ?? "",
    institutionName: raw[FORM_COLS.institutionName] ?? raw["institution_name"] ?? "",
    division: raw[FORM_COLS.division] ?? raw["division"] ?? "",
    department: raw[FORM_COLS.department] ?? raw["department"] ?? "",
    unitType: raw[FORM_COLS.unitType] ?? raw["unit_type"] ?? "",
    standardBeds: safeInt(raw[FORM_COLS.standardBeds] ?? raw["standard_beds"]),
    occupancyPercent: safeFloat(raw[FORM_COLS.occupancyPercent] ?? raw["occupancy_percent"]),
    ventilatedPatients: safeInt(raw[FORM_COLS.ventilatedPatients] ?? raw["ventilated_patients"]),
    patientsForStepDown: safeInt(raw[FORM_COLS.patientsForStepDown] ?? raw["patients_for_step_down"]),
    patientsForRegulation: safeInt(raw[FORM_COLS.patientsForRegulation] ?? raw["patients_for_regulation"]),
    pressureSorePatients: safeInt(raw[FORM_COLS.pressureSorePatients] ?? raw["pressure_sore_patients"]),
    fallRiskPatients: safeInt(raw[FORM_COLS.fallRiskPatients] ?? raw["fall_risk_patients"]),
    physicalAdmissions: safeInt(raw[FORM_COLS.physicalAdmissions] ?? raw["physical_admissions"]),
    urgentPatients: safeInt(raw[FORM_COLS.urgentPatients] ?? raw["urgent_patients"]),
    nortonScore: safeFloat(raw[FORM_COLS.nortonScore] ?? raw["norton_score"]),
    mustScore: safeFloat(raw[FORM_COLS.mustScore] ?? raw["must_score"]),
    morseScore: safeFloat(raw[FORM_COLS.morseScore] ?? raw["morse_score"]),
    returningPatientsMonth: safeInt(raw[FORM_COLS.returningPatientsMonth] ?? raw["returning_patients_month"]),
    returningPatientsWeek: safeInt(raw[FORM_COLS.returningPatientsWeek] ?? raw["returning_patients_week"]),
    returningPatientsUrgent: safeInt(raw[FORM_COLS.returningPatientsUrgent] ?? raw["returning_patients_urgent"]),
    regulationCommitteeRehab: safeInt(raw[FORM_COLS.regulationCommitteeRehab] ?? raw["regulation_committee_rehab"]),
    regulationCommitteeChronic: safeInt(raw[FORM_COLS.regulationCommitteeChronic] ?? raw["regulation_committee_chronic"]),
    regulationCommitteeComplexNursing: safeInt(raw[FORM_COLS.regulationCommitteeComplexNursing] ?? raw["regulation_committee_complex_nursing"]),
    isolationPatients: safeInt(raw[FORM_COLS.isolationPatients] ?? raw["isolation_patients"]),
  };
}

// --- Operational sheet row mappers ---

function mapBedStatusRow(raw: Record<string, string>): BedStatusRow {
  const totalBeds = safeInt(raw["total_beds"]);
  const occupiedBeds = safeInt(raw["occupied_beds"]);
  return {
    wardCode: raw["ward_code"] ?? "",
    wardName: raw["ward_name"] ?? "",
    hospital: raw["hospital"] ?? "",
    timestamp: raw["timestamp"] ?? "",
    totalBeds,
    occupiedBeds,
    availableBeds: safeInt(raw["available_beds"]) || Math.max(0, totalBeds - occupiedBeds),
    blockedBeds: safeInt(raw["blocked_beds"]),
    occupancyPercent: safeFloat(raw["occupancy_percent"]) ||
      (totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 1000) / 10 : 0),
  };
}

function mapAdmissionRow(raw: Record<string, string>): AdmissionRow {
  return {
    wardCode: raw["ward_code"] ?? "",
    wardName: raw["ward_name"] ?? "",
    hospital: raw["hospital"] ?? "",
    timestamp: raw["timestamp"] ?? "",
    date: raw["date"] ?? "",
    shift: raw["shift"] ?? "",
    count: safeInt(raw["count"]),
    urgentCount: safeInt(raw["urgent_count"]),
    source: raw["source"] ?? "",
  };
}

function mapDischargeRow(raw: Record<string, string>): DischargeRow {
  return {
    wardCode: raw["ward_code"] ?? "",
    wardName: raw["ward_name"] ?? "",
    hospital: raw["hospital"] ?? "",
    timestamp: raw["timestamp"] ?? "",
    date: raw["date"] ?? "",
    shift: raw["shift"] ?? "",
    count: safeInt(raw["count"]),
    delayedCount: safeInt(raw["delayed_count"]),
    delayReasons: raw["delay_reasons"] ?? "",
  };
}

function mapTransferRow(raw: Record<string, string>): TransferRow {
  return {
    wardCode: raw["ward_code"] ?? "",
    sourceWard: raw["source_ward"] ?? "",
    destWard: raw["dest_ward"] ?? "",
    hospital: raw["hospital"] ?? "",
    timestamp: raw["timestamp"] ?? "",
    date: raw["date"] ?? "",
    count: safeInt(raw["count"]),
    reason: raw["reason"] ?? "",
    status: raw["status"] ?? "",
  };
}

function mapStaffingRow(raw: Record<string, string>): StaffingRow {
  const planned = safeInt(raw["planned_nurses"]);
  const actual = safeInt(raw["actual_nurses"]);
  return {
    wardCode: raw["ward_code"] ?? "",
    wardName: raw["ward_name"] ?? "",
    hospital: raw["hospital"] ?? "",
    timestamp: raw["timestamp"] ?? "",
    date: raw["date"] ?? "",
    shift: raw["shift"] ?? "",
    plannedNurses: planned,
    actualNurses: actual,
    coveragePercent: planned > 0 ? Math.round((actual / planned) * 1000) / 10 : 0,
    nursesToPatientRatio: safeFloat(raw["nurses_to_patient_ratio"]),
    riskFlag: parseBool(raw["risk_flag"] ?? "FALSE"),
  };
}

function mapIncidentRow(raw: Record<string, string>): IncidentRow {
  return {
    wardCode: raw["ward_code"] ?? "",
    wardName: raw["ward_name"] ?? "",
    hospital: raw["hospital"] ?? "",
    timestamp: raw["timestamp"] ?? "",
    date: raw["date"] ?? "",
    incidentType: raw["incident_type"] ?? "",
    severity: raw["severity"] ?? "",
    count: safeInt(raw["count"] ?? "1"),
    description: raw["description"] ?? "",
  };
}

function mapSupplyRow(raw: Record<string, string>): SupplyRow {
  return {
    wardCode: raw["ward_code"] ?? "",
    wardName: raw["ward_name"] ?? "",
    hospital: raw["hospital"] ?? "",
    timestamp: raw["timestamp"] ?? "",
    date: raw["date"] ?? "",
    category: raw["category"] ?? "",
    itemName: raw["item_name"] ?? "",
    urgency: raw["urgency"] ?? "",
    requestedAmount: safeInt(raw["requested_amount"]),
    availableAmount: safeInt(raw["available_amount"]),
  };
}

// --- Risk computation ---

function computeRiskLevel(snap: FormSnapshot): { level: string; factors: string[] } {
  const factors: string[] = [];
  const occ = snap.occupancyPercent;

  if (occ > 95) {
    factors.push(`תפוסה קריטית: ${occ}%`);
  } else if (occ > 90) {
    factors.push(`תפוסה גבוהה: ${occ}%`);
  } else if (occ > 80) {
    factors.push(`תפוסה מעל 80%: ${occ}%`);
  }

  if (snap.ventilatedPatients > 3) {
    factors.push(`${snap.ventilatedPatients} מטופלים מונשמים`);
  } else if (snap.ventilatedPatients > 2) {
    factors.push(`${snap.ventilatedPatients} מטופלים מונשמים`);
  }

  if (snap.fallRiskPatients > 5) {
    factors.push(`${snap.fallRiskPatients} מטופלים מועדים לנפילה`);
  } else if (snap.fallRiskPatients > 3) {
    factors.push(`${snap.fallRiskPatients} מטופלים מועדים לנפילה`);
  }

  if (snap.pressureSorePatients > 3) {
    factors.push(`${snap.pressureSorePatients} מטופלים עם פצעי לחץ`);
  } else if (snap.pressureSorePatients > 2) {
    factors.push(`${snap.pressureSorePatients} מטופלים עם פצעי לחץ`);
  }

  if (snap.urgentPatients > 5) {
    factors.push(`${snap.urgentPatients} מטופלים דחופים`);
  }

  // Determine level
  const isHighOccupancy = occ > 90;
  const hasHighClinical = snap.ventilatedPatients > 3 || snap.fallRiskPatients > 5 || snap.pressureSorePatients > 3;
  const isMediumOccupancy = occ > 80;
  const hasMediumClinical = snap.ventilatedPatients > 2 || snap.fallRiskPatients > 3;

  let level: string;
  if (isHighOccupancy && hasHighClinical) {
    level = "high";
  } else if (isHighOccupancy || (isMediumOccupancy && hasMediumClinical)) {
    level = "medium";
  } else if (isMediumOccupancy || hasMediumClinical) {
    level = "medium";
  } else {
    level = "low";
  }

  return { level, factors };
}

function snapshotToKpi(snap: FormSnapshot, ward: WardMaster | null): WardKpi {
  const beds = snap.standardBeds || ward?.totalBeds || 0;
  const occupied = beds > 0 ? Math.round(beds * snap.occupancyPercent / 100) : 0;
  const { level: riskLevel, factors: riskFactors } = computeRiskLevel(snap);

  // Validate occupancy bounds
  const validOccupancyPercent = Math.min(Math.max(snap.occupancyPercent, 0), 100);
  const validOccupied = Math.min(occupied, beds);

  return {
    wardCode: ward?.wardCode ?? "",
    wardName: snap.department || ward?.wardName || "",
    hospital: snap.institutionName || ward?.hospital || "",
    reportTimestamp: snap.timestamp,
    lastUpdated: snap.timestamp || null,
    standardBeds: beds,
    occupancyPercent: validOccupancyPercent,
    occupiedBeds: validOccupied,
    availableBeds: beds - validOccupied,
    ventilatedPatients: snap.ventilatedPatients,
    isolationPatients: snap.isolationPatients,
    fallRiskPatients: snap.fallRiskPatients,
    pressureSorePatients: snap.pressureSorePatients,
    urgentPatients: snap.urgentPatients,
    physicalAdmissions: snap.physicalAdmissions,
    nortonScore: snap.nortonScore,
    mustScore: snap.mustScore,
    morseScore: snap.morseScore,
    patientsForStepDown: snap.patientsForStepDown,
    patientsForRegulation: snap.patientsForRegulation,
    returningPatientsMonth: snap.returningPatientsMonth,
    returningPatientsWeek: snap.returningPatientsWeek,
    returningPatientsUrgent: snap.returningPatientsUrgent,
    regulationCommitteeRehab: snap.regulationCommitteeRehab,
    regulationCommitteeChronic: snap.regulationCommitteeChronic,
    regulationCommitteeComplexNursing: snap.regulationCommitteeComplexNursing,
    worsenedPatients: 0,
    delayedTreatmentPatients: 0,
    deceasedLast24h: 0,
    legalStatusPatients: 0,
    psychiatricCommitteePatients: 0,
    riskLevel,
    riskFactors,
  };
}

function computeWardKpis(wards: WardMaster[], snapshots: FormSnapshot[], asOfDate?: string): WardKpi[] {
  const kpis: WardKpi[] = [];

  // Filter to active wards only for aggregation purposes
  const activeWards = wards.filter((w) => w.active !== false);

  let filteredSnapshots = snapshots;
  if (asOfDate) {
    const cutoff = `${asOfDate} 23:59:59`;
    filteredSnapshots = snapshots.filter((s) => s.timestamp <= cutoff);
  }

  // Validate and drop clearly invalid snapshot rows
  filteredSnapshots = filteredSnapshots.filter((s) => {
    if (s.occupancyPercent < 0 || s.occupancyPercent > 150) {
      console.warn(`Dropping invalid snapshot: occupancy ${s.occupancyPercent}% for ${s.department} @ ${s.institutionName}`);
      return false;
    }
    if (s.standardBeds < 0) {
      console.warn(`Dropping snapshot with negative bed count for ${s.department} @ ${s.institutionName}`);
      return false;
    }
    return true;
  });

  // Build lookup maps for efficient ward matching
  // Primary: wardCode (exact match, if form includes ward_code field)
  // Secondary: normalized name + normalized hospital
  const wardByCode = new Map<string, WardMaster>();
  const wardByNameAndHospital = new Map<string, WardMaster>();
  const wardByName = new Map<string, WardMaster>();

  for (const w of activeWards) {
    if (w.wardCode) wardByCode.set(w.wardCode, w);
    const nameKey = `${normalizeHebrew(w.hospital)}|${normalizeHebrew(w.wardName)}`;
    wardByNameAndHospital.set(nameKey, w);
    if (!wardByName.has(normalizeHebrew(w.wardName))) {
      wardByName.set(normalizeHebrew(w.wardName), w);
    }
  }

  // Build a map: latest snapshot per department key
  const latestByDept = new Map<string, FormSnapshot>();
  for (const snap of filteredSnapshots) {
    const key = `${snap.institutionName}|${snap.department}`;
    const existing = latestByDept.get(key);
    if (!existing || snap.timestamp > existing.timestamp) {
      latestByDept.set(key, snap);
    }
  }

  const matchedWardCodes = new Set<string>();

  for (const [, snap] of Array.from(latestByDept)) {
    // Try matching by ward_code if present in form data
    let ward: WardMaster | undefined;

    // 1. Try exact ward_code match (if form emits a ward_code field in future)
    const snapAsAny = snap as any;
    if (snapAsAny.wardCode) {
      ward = wardByCode.get(snapAsAny.wardCode);
    }

    // 2. Try normalized name + hospital match
    if (!ward) {
      const nameKey = `${normalizeHebrew(snap.institutionName)}|${normalizeHebrew(snap.department)}`;
      ward = wardByNameAndHospital.get(nameKey);
    }

    // 3. Fallback: name-only match (log warning for visibility)
    if (!ward) {
      ward = wardByName.get(normalizeHebrew(snap.department));
      if (ward) {
        console.warn(
          `Ward matched by name only (no hospital): "${snap.department}" @ "${snap.institutionName}" → ${ward.wardCode}`
        );
      }
    }

    if (!ward) {
      console.warn(`No ward found for form submission: "${snap.department}" @ "${snap.institutionName}"`);
    }

    if (ward) {
      matchedWardCodes.add(ward.wardCode);
    }
    kpis.push(snapshotToKpi(snap, ward ?? null));
  }

  // For active wards with no form submission, add zero-data entries
  for (const ward of activeWards) {
    if (!matchedWardCodes.has(ward.wardCode)) {
      kpis.push({
        wardCode: ward.wardCode,
        wardName: ward.wardName,
        hospital: ward.hospital,
        reportTimestamp: "",
        lastUpdated: null,
        standardBeds: ward.totalBeds,
        occupancyPercent: 0,
        occupiedBeds: 0,
        availableBeds: ward.totalBeds,
        ventilatedPatients: 0,
        isolationPatients: 0,
        fallRiskPatients: 0,
        pressureSorePatients: 0,
        urgentPatients: 0,
        physicalAdmissions: 0,
        nortonScore: 0,
        mustScore: 0,
        morseScore: 0,
        patientsForStepDown: 0,
        patientsForRegulation: 0,
        returningPatientsMonth: 0,
        returningPatientsWeek: 0,
        returningPatientsUrgent: 0,
        regulationCommitteeRehab: 0,
        regulationCommitteeChronic: 0,
        regulationCommitteeComplexNursing: 0,
        worsenedPatients: 0,
        delayedTreatmentPatients: 0,
        deceasedLast24h: 0,
        legalStatusPatients: 0,
        psychiatricCommitteePatients: 0,
        riskLevel: "low",
        riskFactors: [],
      });
    }
  }

  return kpis;
}

function computeOverviewStats(kpis: WardKpi[]): OverviewStats {
  const totalBeds = kpis.reduce((s, k) => s + k.standardBeds, 0);
  const occupiedBeds = kpis.reduce((s, k) => s + k.occupiedBeds, 0);
  const availableBeds = kpis.reduce((s, k) => s + k.availableBeds, 0);
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 1000) / 10 : 0;

  const withScores = kpis.filter((k) => k.nortonScore > 0 || k.mustScore > 0 || k.morseScore > 0);
  const avgNorton = withScores.length > 0
    ? Math.round(withScores.reduce((s, k) => s + k.nortonScore, 0) / withScores.length * 10) / 10
    : 0;
  const avgMust = withScores.length > 0
    ? Math.round(withScores.reduce((s, k) => s + k.mustScore, 0) / withScores.length * 10) / 10
    : 0;
  const avgMorse = withScores.length > 0
    ? Math.round(withScores.reduce((s, k) => s + k.morseScore, 0) / withScores.length * 10) / 10
    : 0;

  return {
    totalBeds,
    occupiedBeds,
    availableBeds,
    occupancyRate,
    ventilatedPatients: kpis.reduce((s, k) => s + k.ventilatedPatients, 0),
    isolationPatients: kpis.reduce((s, k) => s + k.isolationPatients, 0),
    fallRiskPatients: kpis.reduce((s, k) => s + k.fallRiskPatients, 0),
    pressureSorePatients: kpis.reduce((s, k) => s + k.pressureSorePatients, 0),
    physicalAdmissions: kpis.reduce((s, k) => s + k.physicalAdmissions, 0),
    urgentPatients: kpis.reduce((s, k) => s + k.urgentPatients, 0),
    returningPatientsMonth: kpis.reduce((s, k) => s + k.returningPatientsMonth, 0),
    avgNortonScore: avgNorton,
    avgMustScore: avgMust,
    avgMorseScore: avgMorse,
    regulationCommitteeTotal: kpis.reduce((s, k) =>
      s + k.regulationCommitteeRehab + k.regulationCommitteeChronic + k.regulationCommitteeComplexNursing, 0),
    patientsForStepDown: kpis.reduce((s, k) => s + k.patientsForStepDown, 0),
    patientsForRegulation: kpis.reduce((s, k) => s + k.patientsForRegulation, 0),
    highRiskWards: kpis.filter((k) => k.riskLevel === "high").length,
    mediumRiskWards: kpis.filter((k) => k.riskLevel === "medium").length,
    totalWards: kpis.length,
  };
}

// --- SheetsStorage ---
export class SheetsStorage implements IStorage {
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

  private fetchSheetSafe<T>(worksheetId: number, mapper: (raw: Record<string, string>) => T): T[] {
    try {
      const raw = fetchSheet(worksheetId);
      if (!raw || raw.length < 2) return [];
      return rowsToRawObjects(raw).map(mapper);
    } catch (err) {
      console.error(`Failed to fetch worksheet ${worksheetId}:`, err);
      return [];
    }
  }

  private fetchWards(): WardMaster[] {
    try {
      const raw = fetchSheet(WORKSHEET_IDS.ward_master);
      const rows = rowsToRawObjects(raw);
      const wards = rows.map((r, i) => mapWard(r, i + 1));
      if (wards.length > 0) return wards;
    } catch (err) {
      console.error("Failed to fetch wards from Sheets:", err);
    }
    // Fallback: read from local wards.json
    try {
      const filePath = join(__dirname, "..", "data", "wards.json");
      const raw = readFileSync(filePath, "utf-8");
      const rows = JSON.parse(raw) as Array<{
        ward_code: string;
        ward_name: string;
        hospital: string;
        specialty: string;
        total_beds: number;
        manager: string;
        active: boolean;
      }>;
      console.log(`Loaded ${rows.length} wards from wards.json fallback`);
      return rows.map((r, i) => ({
        id: i + 1,
        wardCode: r.ward_code,
        wardName: r.ward_name,
        hospital: r.hospital,
        specialty: r.specialty,
        totalBeds: r.total_beds,
        manager: r.manager ?? "",
        active: r.active !== false,
      }));
    } catch (fallbackErr) {
      console.error("Failed to load wards.json fallback:", fallbackErr);
      return [];
    }
  }

  private fetchFormSnapshots(): FormSnapshot[] {
    return this.fetchSheetSafe(WORKSHEET_IDS.form_responses, mapFormSnapshot);
  }

  // --- IStorage implementation ---

  async getWards(): Promise<WardMaster[]> {
    return this.getCachedOrFetch("wards", () => this.fetchWards());
  }

  async getWardsByHospital(hospitalName: string): Promise<WardMaster[]> {
    const wards = await this.getWards();
    return wards.filter((w) => w.active !== false && w.hospital === hospitalName);
  }

  async getFormSnapshots(): Promise<FormSnapshot[]> {
    return this.getCachedOrFetch("formSnapshots", () => this.fetchFormSnapshots());
  }

  async getWardKpis(asOfDate?: string): Promise<WardKpi[]> {
    if (asOfDate) {
      const wards = await this.getWards();
      const snapshots = await this.getFormSnapshots();
      return computeWardKpis(wards, snapshots, asOfDate);
    }
    return this.getCachedOrFetch("wardKpis", async () => {
      const wards = await this.getWards();
      const snapshots = await this.getFormSnapshots();
      return computeWardKpis(wards, snapshots);
    });
  }

  async getWardKpisByHospital(hospitalName: string, asOfDate?: string): Promise<WardKpi[]> {
    const kpis = await this.getWardKpis(asOfDate);
    return kpis.filter((k) => k.hospital === hospitalName);
  }

  async getOverviewStats(hospitalName?: string, asOfDate?: string): Promise<OverviewStats> {
    let kpis = await this.getWardKpis(asOfDate);
    if (hospitalName) {
      kpis = kpis.filter((k) => k.hospital === hospitalName);
    }
    return computeOverviewStats(kpis);
  }

  // --- Hospital methods ---

  private hospitalsCache: Hospital[] | null = null;

  async getHospitals(): Promise<Hospital[]> {
    if (this.hospitalsCache) return this.hospitalsCache;
    try {
      const filePath = join(__dirname, "..", "data", "hospitals.json");
      const raw = readFileSync(filePath, "utf-8");
      this.hospitalsCache = JSON.parse(raw) as Hospital[];
      return this.hospitalsCache;
    } catch (err) {
      console.error("Failed to load hospitals.json:", err);
      return [];
    }
  }

  async getHospitalOverview(asOfDate?: string): Promise<HospitalOverviewData[]> {
    const hospitals = await this.getHospitals();
    const kpis = await this.getWardKpis(asOfDate);
    const wards = await this.getWards();

    const wardHospital = new Map<string, string>();
    for (const w of wards) {
      wardHospital.set(w.wardCode, w.hospital);
    }

    const kpisByHospital = new Map<string, WardKpi[]>();
    for (const kpi of kpis) {
      const hospital = kpi.hospital || wardHospital.get(kpi.wardCode) || "";
      if (!kpisByHospital.has(hospital)) kpisByHospital.set(hospital, []);
      kpisByHospital.get(hospital)!.push(kpi);
    }

    return hospitals.map((h) => {
      const hKpis = kpisByHospital.get(h.name) ?? [];
      const totalBeds = hKpis.reduce((s, k) => s + k.standardBeds, 0);
      const occupiedBeds = hKpis.reduce((s, k) => s + k.occupiedBeds, 0);
      const availableBeds = hKpis.reduce((s, k) => s + k.availableBeds, 0);
      const highRiskWards = hKpis.filter((k) => k.riskLevel === "high").length;
      const mediumRiskWards = hKpis.filter((k) => k.riskLevel === "medium").length;
      const overallRisk = highRiskWards > 0 ? "high" : mediumRiskWards > 0 ? "medium" : "low";

      return {
        code: h.code,
        name: h.name,
        fullName: h.fullName,
        city: h.city,
        type: h.type,
        totalBeds,
        occupiedBeds,
        availableBeds,
        occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 1000) / 10 : 0,
        totalWards: hKpis.length,
        ventilatedPatients: hKpis.reduce((s, k) => s + k.ventilatedPatients, 0),
        isolationPatients: hKpis.reduce((s, k) => s + k.isolationPatients, 0),
        fallRiskPatients: hKpis.reduce((s, k) => s + k.fallRiskPatients, 0),
        pressureSorePatients: hKpis.reduce((s, k) => s + k.pressureSorePatients, 0),
        physicalAdmissions: hKpis.reduce((s, k) => s + k.physicalAdmissions, 0),
        urgentPatients: hKpis.reduce((s, k) => s + k.urgentPatients, 0),
        highRiskWards,
        mediumRiskWards,
        overallRisk,
        lat: h.lat,
        lng: h.lng,
      };
    });
  }

  // --- Operational sheet methods ---

  async getBedStatus(wardCode?: string, hospitalName?: string): Promise<BedStatusRow[]> {
    const rows = this.getCachedOrFetch("bedStatus", () =>
      this.fetchSheetSafe(WORKSHEET_IDS.bed_status, mapBedStatusRow)
    );
    return rows.filter((r) =>
      (!wardCode || r.wardCode === wardCode) &&
      (!hospitalName || r.hospital === hospitalName)
    );
  }

  async getAdmissions(wardCode?: string, dateFrom?: string): Promise<AdmissionRow[]> {
    const rows = this.getCachedOrFetch("admissions", () =>
      this.fetchSheetSafe(WORKSHEET_IDS.admissions, mapAdmissionRow)
    );
    return rows.filter((r) =>
      (!wardCode || r.wardCode === wardCode) &&
      (!dateFrom || r.date >= dateFrom)
    );
  }

  async getDischarges(wardCode?: string, dateFrom?: string): Promise<DischargeRow[]> {
    const rows = this.getCachedOrFetch("discharges", () =>
      this.fetchSheetSafe(WORKSHEET_IDS.discharges, mapDischargeRow)
    );
    return rows.filter((r) =>
      (!wardCode || r.wardCode === wardCode) &&
      (!dateFrom || r.date >= dateFrom)
    );
  }

  async getTransfers(wardCode?: string): Promise<TransferRow[]> {
    const rows = this.getCachedOrFetch("transfers", () =>
      this.fetchSheetSafe(WORKSHEET_IDS.transfers, mapTransferRow)
    );
    return rows.filter((r) =>
      !wardCode || r.wardCode === wardCode || r.sourceWard === wardCode || r.destWard === wardCode
    );
  }

  async getStaffing(wardCode?: string): Promise<StaffingRow[]> {
    const rows = this.getCachedOrFetch("staffing", () =>
      this.fetchSheetSafe(WORKSHEET_IDS.staffing, mapStaffingRow)
    );
    return rows.filter((r) => !wardCode || r.wardCode === wardCode);
  }

  async getIncidents(wardCode?: string, hospitalName?: string): Promise<IncidentRow[]> {
    const rows = this.getCachedOrFetch("incidents", () =>
      this.fetchSheetSafe(WORKSHEET_IDS.incidents, mapIncidentRow)
    );
    return rows.filter((r) =>
      (!wardCode || r.wardCode === wardCode) &&
      (!hospitalName || r.hospital === hospitalName)
    );
  }

  async getSupplies(wardCode?: string): Promise<SupplyRow[]> {
    const rows = this.getCachedOrFetch("supplies", () =>
      this.fetchSheetSafe(WORKSHEET_IDS.supplies, mapSupplyRow)
    );
    return rows.filter((r) => !wardCode || r.wardCode === wardCode);
  }

  async getOccupancyTrend(wardCode: string, days = 14): Promise<OccupancyTrendPoint[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    // Try bed_status sheet first (most granular)
    const bedRows = (await this.getBedStatus(wardCode))
      .filter((r) => r.timestamp >= cutoffStr && r.totalBeds > 0);

    // Group by date
    const byDate = new Map<string, { occ: number[]; total: number[] }>();
    for (const row of bedRows) {
      const date = row.timestamp.slice(0, 10);
      if (!byDate.has(date)) byDate.set(date, { occ: [], total: [] });
      byDate.get(date)!.occ.push(row.occupiedBeds);
      byDate.get(date)!.total.push(row.totalBeds);
    }

    // Overlay admission/discharge counts
    const admRows = await this.getAdmissions(wardCode, cutoffStr);
    const disRows = await this.getDischarges(wardCode, cutoffStr);
    const admByDate = new Map<string, number>();
    const disByDate = new Map<string, number>();
    for (const r of admRows) admByDate.set(r.date, (admByDate.get(r.date) ?? 0) + r.count);
    for (const r of disRows) disByDate.set(r.date, (disByDate.get(r.date) ?? 0) + r.count);

    const allDates = new Set([
      ...Array.from(byDate.keys()),
      ...Array.from(admByDate.keys()),
      ...Array.from(disByDate.keys()),
    ]);
    const points: OccupancyTrendPoint[] = [];

    for (const date of Array.from(allDates).sort()) {
      const d = byDate.get(date);
      const avgOcc = d ? d.occ.reduce((s, v) => s + v, 0) / d.occ.length : 0;
      const avgTotal = d ? d.total.reduce((s, v) => s + v, 0) / d.total.length : 0;
      points.push({
        date,
        occupancyRate: avgTotal > 0 ? Math.round((avgOcc / avgTotal) * 1000) / 10 : 0,
        occupiedBeds: Math.round(avgOcc),
        totalBeds: Math.round(avgTotal),
        admissions: admByDate.get(date) ?? 0,
        discharges: disByDate.get(date) ?? 0,
      });
    }

    return points;
  }
}

export const storage = new SheetsStorage();
