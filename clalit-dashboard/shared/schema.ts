import { pgTable, text, serial, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Ward Master Reference (from wards.json / ward_master sheet)
export const wardMaster = pgTable("ward_master", {
  id: serial("id").primaryKey(),
  wardCode: text("ward_code").notNull().unique(),
  wardName: text("ward_name").notNull(),
  hospital: text("hospital").notNull(),
  specialty: text("specialty").notNull(),
  totalBeds: integer("total_beds").notNull(),
  manager: text("manager").notNull(),
  active: boolean("active").notNull().default(true),
});

// ─── Form Snapshot (from Google Forms → form_responses sheet) ───────────
// Each row = one ward submission via the Google Form
export interface FormSnapshot {
  timestamp: string;               // חותמת זמן (auto from Google Forms)
  institutionName: string;         // שם המוסד
  division: string;                // חטיבה
  department: string;              // מחלקה
  unitType: string;                // סוג יחידה
  standardBeds: number;            // מספר מיטות תקן
  occupancyPercent: number;        // אחוז תפוסה
  ventilatedPatients: number;      // כמות מונשמים
  patientsForStepDown: number;     // מספר מטופלים לרידוד
  patientsForRegulation: number;   // מספר מטופלים לויסות
  pressureSorePatients: number;    // מספר מטופלים עם פצעי לחץ
  fallRiskPatients: number;        // מספר מועדים לנפילה
  physicalAdmissions: number;      // מספר קבלה פיזית
  urgentPatients: number;          // מספר מטופלים דחופים
  nortonScore: number;             // אומדן נורטון
  mustScore: number;               // אומדן מאסט
  morseScore: number;              // אומדן מורס
  returningPatientsMonth: number;  // מספר מטופלים חוזרים (חודש)
  returningPatientsWeek: number;   // מספר מטופלים חוזרים (שבוע)
  returningPatientsUrgent: number; // מספר מטופלים חוזרים (דחוף)
  regulationCommitteeRehab: number;          // ועדה לויסות חולים (שיקומי)
  regulationCommitteeChronic: number;        // ועדה לויסות חולים (מונשם כרוני)
  regulationCommitteeComplexNursing: number; // ועדה לויסות מטופלים (סיעודי מורכב)
  isolationPatients: number;       // מספר מטופלים לבידוד
}

// ─── KPI per ward (computed from latest FormSnapshot) ──────────────────
export interface WardKpi {
  wardCode: string;
  wardName: string;
  hospital: string;
  reportTimestamp: string;
  // Capacity
  standardBeds: number;
  occupancyPercent: number;
  occupiedBeds: number;
  availableBeds: number;
  // Clinical
  ventilatedPatients: number;
  isolationPatients: number;
  fallRiskPatients: number;
  pressureSorePatients: number;
  urgentPatients: number;
  physicalAdmissions: number;
  // Assessments
  nortonScore: number;
  mustScore: number;
  morseScore: number;
  // Patient flow
  patientsForStepDown: number;
  patientsForRegulation: number;
  returningPatientsMonth: number;
  returningPatientsWeek: number;
  returningPatientsUrgent: number;
  // Regulation committees
  regulationCommitteeRehab: number;
  regulationCommitteeChronic: number;
  regulationCommitteeComplexNursing: number;
  // General hospital-specific
  worsenedPatients: number;              // מטופלים שמצבם הוחמר
  delayedTreatmentPatients: number;     // מטופלים שהטיפול התעכב
  deceasedLast24h: number;              // נפטרו ב-24 שעות אחרונות
  // Psychiatric-specific
  legalStatusPatients: number;           // סטטוס משפטי
  psychiatricCommitteePatients: number;  // מטופלים לועדה פסיכיאטרית
  // Risk
  riskLevel: string; // "low" | "medium" | "high"
  riskFactors: string[]; // human-readable reasons for the risk level
  lastUpdated: string | null; // ISO timestamp of the most recent form submission, or null if no data
}

// ─── Hospital reference (from hospitals.json) ──────────────────────────
export interface Hospital {
  code: string;
  name: string;
  nameEn: string;
  fullName: string;
  city: string;
  type: string; // כללי/פסיכיאטרי/שיקומי/גריאטרי
  beds: number;
  lat: number;
  lng: number;
}

// ─── Aggregated hospital overview data ─────────────────────────────────
export interface HospitalOverviewData {
  code: string;
  name: string;
  fullName: string;
  city: string;
  type: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
  totalWards: number;
  ventilatedPatients: number;
  isolationPatients: number;
  fallRiskPatients: number;
  pressureSorePatients: number;
  physicalAdmissions: number;
  urgentPatients: number;
  highRiskWards: number;
  mediumRiskWards: number;
  overallRisk: string; // high/medium/low
  lat: number;
  lng: number;
}

// ─── Overview stats (aggregated for API response) ──────────────────────
export interface OverviewStats {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
  ventilatedPatients: number;
  isolationPatients: number;
  fallRiskPatients: number;
  pressureSorePatients: number;
  physicalAdmissions: number;
  urgentPatients: number;
  returningPatientsMonth: number;
  avgNortonScore: number;
  avgMustScore: number;
  avgMorseScore: number;
  regulationCommitteeTotal: number;
  patientsForStepDown: number;
  patientsForRegulation: number;
  highRiskWards: number;
  mediumRiskWards: number;
  totalWards: number;
}

// ─── Operational sheet row types (from Google Sheets worksheets) ──────────

export interface BedStatusRow {
  wardCode: string;
  wardName: string;
  hospital: string;
  timestamp: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  blockedBeds: number;
  occupancyPercent: number;
}

export interface AdmissionRow {
  wardCode: string;
  wardName: string;
  hospital: string;
  timestamp: string;
  date: string;
  shift: string; // "morning" | "afternoon" | "night"
  count: number;
  urgentCount: number;
  source: string; // e.g. "ER" | "transfer" | "direct"
}

export interface DischargeRow {
  wardCode: string;
  wardName: string;
  hospital: string;
  timestamp: string;
  date: string;
  shift: string;
  count: number;
  delayedCount: number;
  delayReasons: string;
}

export interface TransferRow {
  wardCode: string;
  sourceWard: string;
  destWard: string;
  hospital: string;
  timestamp: string;
  date: string;
  count: number;
  reason: string;
  status: string; // "completed" | "pending" | "cancelled"
}

export interface StaffingRow {
  wardCode: string;
  wardName: string;
  hospital: string;
  timestamp: string;
  date: string;
  shift: string;
  plannedNurses: number;
  actualNurses: number;
  coveragePercent: number;
  nursesToPatientRatio: number;
  riskFlag: boolean;
}

export interface IncidentRow {
  wardCode: string;
  wardName: string;
  hospital: string;
  timestamp: string;
  date: string;
  incidentType: string; // "fall" | "medication_error" | "equipment_failure" | "infection_control" | "other"
  severity: string;     // "low" | "medium" | "high" | "critical"
  count: number;
  description: string;
}

export interface SupplyRow {
  wardCode: string;
  wardName: string;
  hospital: string;
  timestamp: string;
  date: string;
  category: string; // "PPE" | "medication" | "equipment" | "linen" | "other"
  itemName: string;
  urgency: string;  // "low" | "medium" | "high"
  requestedAmount: number;
  availableAmount: number;
}

// ─── Occupancy trend data point ──────────────────────────────────────────

export interface OccupancyTrendPoint {
  date: string;
  occupancyRate: number;
  occupiedBeds: number;
  totalBeds: number;
  admissions: number;
  discharges: number;
}

// ─── Imaging devices ──────────────────────────────────────────────────────
export type ImagingDeviceStatus = "זמין" | "לא זמין" | "ידני" | "לא קיים";

export interface ImagingDevice {
  name: string;
  status: ImagingDeviceStatus;
}

export const IMAGING_DEVICES: string[] = [
  "רנטגן",
  "CT",
  "MRI",
  "PET CT",
  "צנתור לב",
  "צנתור מוח",
  "רדיותרפיה",
  "מעבדות",
];

// ─── System status ──────────────────────────────────────────────────────────
export type SystemStatusLevel = "תקין" | "מושבת/מנותק" | "נפגע" | "שיקום";

export interface SystemStatus {
  name: string;
  status: SystemStatusLevel;
}

export const HOSPITAL_SYSTEMS: string[] = [
  "ATD",
  "LIS",
  "Metavision",
  "PACS",
  "RIS",
  "אונקופרו",
  "אופק",
  "אתר מרוחק",
  "מנור",
  "קליקס בי״ח",
  "קמיליון",
  "QFLOW",
  "SAP",
  "SAP לוגיסטיקה",
  "SAP משאבי אנוש",
  "מערכת חדרי ניתוח",
  "טלפוניית IP",
  "תשתיות אינטרנט",
];

// Insert schemas
export const insertWardMasterSchema = createInsertSchema(wardMaster).omit({ id: true });

// Types
export type WardMaster = typeof wardMaster.$inferSelect;
export type InsertWardMaster = z.infer<typeof insertWardMasterSchema>;
