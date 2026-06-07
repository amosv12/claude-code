import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { HOSPITAL_SYSTEMS, IMAGING_DEVICES } from "@shared/schema";
import type { SystemStatus, ImagingDevice } from "@shared/schema";

// ─── Input Validation Helpers ──────────────────────────────────────────

function sanitizeString(val: unknown, maxLen = 100): string | undefined {
  if (val === undefined || val === null) return undefined;
  const s = String(val).replace(/[\x00-\x1f\x7f]/g, "").trim();
  if (s.length === 0) return undefined;
  return s.slice(0, maxLen);
}

function sanitizeDate(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  return s;
}

function sanitizePositiveInt(val: unknown, defaultVal: number): number {
  if (val === undefined || val === null) return defaultVal;
  const n = parseInt(String(val), 10);
  return isNaN(n) || n < 1 ? defaultVal : n;
}

function asyncHandler(fn: (req: any, res: any) => Promise<any>) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

export async function registerRoutes(httpServer: Server, app: Express) {
  // --- Hospital endpoints ---

  app.get("/api/hospitals", asyncHandler(async (_req, res) => {
    const hospitals = await storage.getHospitals();
    res.json(hospitals);
  }));

  app.get("/api/hospitals/overview", asyncHandler(async (req, res) => {
    const asOfDate = sanitizeDate(req.query.asOfDate);
    const data = await storage.getHospitalOverview(asOfDate);
    res.json(data);
  }));

  // Ward master data (optional hospital filter, active-only by default)
  app.get("/api/wards", asyncHandler(async (req, res) => {
    const hospital = sanitizeString(req.query.hospital);
    if (hospital) {
      const wards = await storage.getWardsByHospital(hospital);
      res.json(wards);
    } else {
      const wards = await storage.getWards();
      res.json(wards);
    }
  }));

  // Ward KPIs (computed from form snapshots)
  app.get("/api/kpi/current", asyncHandler(async (req, res) => {
    const hospital = sanitizeString(req.query.hospital);
    const asOfDate = sanitizeDate(req.query.asOfDate);
    if (hospital) {
      const data = await storage.getWardKpisByHospital(hospital, asOfDate);
      res.json(data);
    } else {
      const data = await storage.getWardKpis(asOfDate);
      res.json(data);
    }
  }));

  // Overview stats (aggregated)
  app.get("/api/stats/overview", asyncHandler(async (req, res) => {
    const hospital = sanitizeString(req.query.hospital);
    const asOfDate = sanitizeDate(req.query.asOfDate);
    const data = await storage.getOverviewStats(hospital, asOfDate);
    res.json(data);
  }));

  // Raw form snapshots (for debug / admin)
  app.get("/api/form-snapshots", asyncHandler(async (_req, res) => {
    const data = await storage.getFormSnapshots();
    res.json(data);
  }));

  // Systems status
  app.get("/api/systems", asyncHandler(async (_req, res) => {
    const systems: SystemStatus[] = HOSPITAL_SYSTEMS.map((name) => ({
      name,
      status: "תקין" as const,
    }));
    res.json(systems);
  }));

  // Imaging devices
  app.get("/api/imaging", asyncHandler(async (_req, res) => {
    const devices: ImagingDevice[] = IMAGING_DEVICES.map((name) => ({
      name,
      status: "זמין" as const,
    }));
    res.json(devices);
  }));

  // ─── Operational sheet endpoints ─────────────────────────────────────────

  // Bed status: GET /api/beds?ward_code=SOR-001&hospital=סורוקה
  app.get("/api/beds", asyncHandler(async (req, res) => {
    const wardCode = sanitizeString(req.query.ward_code);
    const hospital = sanitizeString(req.query.hospital);
    const data = await storage.getBedStatus(wardCode, hospital);
    res.json(data);
  }));

  // Admissions: GET /api/admissions?ward_code=SOR-001&date_from=2024-01-01
  app.get("/api/admissions", asyncHandler(async (req, res) => {
    const wardCode = sanitizeString(req.query.ward_code);
    const dateFrom = sanitizeDate(req.query.date_from);
    const data = await storage.getAdmissions(wardCode, dateFrom);
    res.json(data);
  }));

  // Discharges: GET /api/discharges?ward_code=SOR-001&date_from=2024-01-01
  app.get("/api/discharges", asyncHandler(async (req, res) => {
    const wardCode = sanitizeString(req.query.ward_code);
    const dateFrom = sanitizeDate(req.query.date_from);
    const data = await storage.getDischarges(wardCode, dateFrom);
    res.json(data);
  }));

  // Transfers: GET /api/transfers?ward_code=SOR-001
  app.get("/api/transfers", asyncHandler(async (req, res) => {
    const wardCode = sanitizeString(req.query.ward_code);
    const data = await storage.getTransfers(wardCode);
    res.json(data);
  }));

  // Staffing: GET /api/staffing?ward_code=SOR-001
  app.get("/api/staffing", asyncHandler(async (req, res) => {
    const wardCode = sanitizeString(req.query.ward_code);
    const data = await storage.getStaffing(wardCode);
    res.json(data);
  }));

  // Incidents: GET /api/incidents?ward_code=SOR-001&hospital=סורוקה
  app.get("/api/incidents", asyncHandler(async (req, res) => {
    const wardCode = sanitizeString(req.query.ward_code);
    const hospital = sanitizeString(req.query.hospital);
    const data = await storage.getIncidents(wardCode, hospital);
    res.json(data);
  }));

  // Supplies: GET /api/supplies?ward_code=SOR-001
  app.get("/api/supplies", asyncHandler(async (req, res) => {
    const wardCode = sanitizeString(req.query.ward_code);
    const data = await storage.getSupplies(wardCode);
    res.json(data);
  }));

  // Occupancy trend: GET /api/trends/:ward_code?days=14
  app.get("/api/trends/:wardCode", asyncHandler(async (req, res) => {
    const wardCode = sanitizeString(req.params.wardCode);
    if (!wardCode) return res.status(400).json({ error: "ward_code required" });
    const days = sanitizePositiveInt(req.query.days, 14);
    const data = await storage.getOccupancyTrend(wardCode, days);
    res.json(data);
  }));
}
