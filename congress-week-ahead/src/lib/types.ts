import type { Chamber, EventType, EventStatus, ConfidenceLevel, FetchStatus } from "./constants";

export interface CongressEvent {
  id: string;
  chamber: Chamber;
  eventType: EventType;
  title: string;
  description: string;
  committeeName: string | null;
  date: string;
  startTimeET: string | null;
  endTimeET: string | null;
  status: EventStatus;
  sourceName: string;
  sourceUrl: string;
  sourcePublishedAt: string | null;
  sourceRetrievedAt: string;
  location: string | null;
  billReference: string | null;
  notes: string | null;
  confidenceLevel: ConfidenceLevel;
  weekStartDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceLog {
  id: string;
  sourceName: string;
  sourceUrl: string;
  fetchedAt: string;
  status: FetchStatus;
  eventsFound: number;
  notes: string | null;
}

export interface WeekSummary {
  weekStartDate: string;
  weekEndDate: string;
  houseInSession: boolean;
  senateInSession: boolean;
  majorFloorItems: string[];
  totalCommitteeHearings: number;
  totalEvents: number;
  lastUpdated: string;
}

export interface EventFilters {
  week?: string;
  chamber?: Chamber;
  eventType?: EventType;
  status?: EventStatus;
  committee?: string;
  search?: string;
}
