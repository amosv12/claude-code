import { v4 as uuid } from "uuid";
import type { CongressEvent } from "@/lib/types";
import type { Chamber, EventType, EventStatus, ConfidenceLevel } from "@/lib/constants";
import { getWeekStart } from "@/lib/dates";

/**
 * Raw event data from a source before normalization.
 * Fields may be incomplete or in non-standard formats.
 */
export interface RawEvent {
  chamber: string;
  eventType: string;
  title: string;
  description?: string;
  committeeName?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  location?: string;
  billReference?: string;
  notes?: string;
  sourceName: string;
  sourceUrl: string;
  sourcePublishedAt?: string;
}

/**
 * Normalize a raw event from any source into the standard CongressEvent model.
 */
export function normalizeEvent(raw: RawEvent): CongressEvent {
  const now = new Date().toISOString();
  const eventDate = new Date(raw.date + "T12:00:00");

  return {
    id: uuid(),
    chamber: normalizeChamber(raw.chamber),
    eventType: normalizeEventType(raw.eventType),
    title: raw.title.trim(),
    description: (raw.description || raw.title).trim(),
    committeeName: raw.committeeName?.trim() || null,
    date: raw.date,
    startTimeET: normalizeTime(raw.startTime),
    endTimeET: normalizeTime(raw.endTime),
    status: normalizeStatus(raw.status),
    sourceName: raw.sourceName,
    sourceUrl: raw.sourceUrl,
    sourcePublishedAt: raw.sourcePublishedAt || null,
    sourceRetrievedAt: now,
    location: raw.location?.trim() || null,
    billReference: raw.billReference?.trim() || null,
    notes: raw.notes?.trim() || null,
    confidenceLevel: inferConfidence(raw.status),
    weekStartDate: getWeekStart(eventDate),
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeChamber(value: string): Chamber {
  const v = value.toLowerCase();
  if (v.includes("senate")) return "Senate";
  return "House";
}

function normalizeEventType(value: string): EventType {
  const v = value.toLowerCase();
  if (v.includes("committee") || v.includes("hearing") || v.includes("markup")) return "Committee";
  return "Floor";
}

function normalizeStatus(value?: string): EventStatus {
  if (!value) return "Expected";
  const v = value.toLowerCase();
  if (v.includes("scheduled") || v.includes("confirmed")) return "Scheduled";
  if (v.includes("tentative") || v.includes("possible")) return "Tentative";
  return "Expected";
}

function inferConfidence(status?: string): ConfidenceLevel {
  if (!status) return "Low";
  const v = status.toLowerCase();
  if (v.includes("scheduled") || v.includes("confirmed")) return "High";
  if (v.includes("tentative") || v.includes("possible")) return "Low";
  return "Medium";
}

/**
 * Normalize time strings into HH:MM format.
 * Handles formats like "10:00 AM", "2:30 PM", "14:00", etc.
 */
function normalizeTime(time?: string): string | null {
  if (!time) return null;

  const cleaned = time.trim().toUpperCase();

  // Already in HH:MM format
  if (/^\d{1,2}:\d{2}$/.test(cleaned)) return cleaned.padStart(5, "0");

  // 12-hour format: "10:00 AM", "2:30 PM"
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const ampm = match[3];

    if (ampm === "PM" && hours !== 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, "0")}:${minutes}`;
  }

  return null;
}
