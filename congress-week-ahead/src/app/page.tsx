import { getDb } from "@/lib/db";
import { congressEvents, sourceLogs } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import WeekAtGlance from "@/components/WeekAtGlance";
import EventList from "@/components/EventList";
import SourcePanel from "@/components/SourcePanel";
import type { CongressEvent, SourceLog, WeekSummary } from "@/lib/types";

const WEEK_START = "2026-03-16";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = getDb();

  const events: CongressEvent[] = (await db
    .select()
    .from(congressEvents)
    .where(eq(congressEvents.weekStartDate, WEEK_START))
    .orderBy(asc(congressEvents.date), asc(congressEvents.startTimeET))) as CongressEvent[];

  const logs: SourceLog[] = (await db.select().from(sourceLogs)) as SourceLog[];

  const houseFloor = events.filter(
    (e) => e.chamber === "House" && e.eventType === "Floor"
  );
  const senateFloor = events.filter(
    (e) => e.chamber === "Senate" && e.eventType === "Floor"
  );
  const committees = events.filter((e) => e.eventType === "Committee");

  const majorFloorItems = events
    .filter(
      (e) =>
        e.eventType === "Floor" &&
        e.billReference &&
        (e.status === "Scheduled" || e.status === "Expected")
    )
    .map((e) => `${e.chamber}: ${e.title}`)
    .slice(0, 5);

  const summary: WeekSummary = {
    weekStartDate: WEEK_START,
    weekEndDate: "2026-03-20",
    houseInSession: houseFloor.length > 0,
    senateInSession: senateFloor.length > 0,
    majorFloorItems,
    totalCommitteeHearings: committees.length,
    totalEvents: events.length,
    lastUpdated: new Date().toISOString(),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-civic-navy mb-2">
          Congress Week Ahead
        </h1>
        <p className="text-slate-600 max-w-2xl">
          Your comprehensive guide to the upcoming week in the U.S. Congress.
          Track floor sessions, committee hearings, votes, and legislative
          business across both chambers.
        </p>
      </div>

      {/* Week summary */}
      <WeekAtGlance summary={summary} />

      {/* Status legend */}
      <div className="flex flex-wrap items-center gap-4 mb-6 text-xs text-slate-600">
        <span className="font-medium">Status Legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Scheduled — Officially confirmed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Tentative — Subject to change
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Expected — Likely but not confirmed
        </span>
      </div>

      {/* All events grouped by day */}
      <EventList
        events={events}
        emptyMessage="No official schedule has been posted for the upcoming week yet."
      />

      {/* Source transparency */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-civic-navy mb-4">
          Data Sources & Transparency
        </h2>
        <SourcePanel logs={logs} />
      </div>
    </div>
  );
}
