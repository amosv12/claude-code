import { getDb } from "@/lib/db";
import { congressEvents } from "@/lib/schema";
import { eq, and, asc } from "drizzle-orm";
import EventList from "@/components/EventList";
import type { CongressEvent } from "@/lib/types";

const WEEK_START = "2026-03-16";

export const dynamic = "force-dynamic";

export default async function SenatePage() {
  const db = getDb();

  const events: CongressEvent[] = (await db
    .select()
    .from(congressEvents)
    .where(
      and(
        eq(congressEvents.weekStartDate, WEEK_START),
        eq(congressEvents.chamber, "Senate")
      )
    )
    .orderBy(asc(congressEvents.date), asc(congressEvents.startTimeET))) as CongressEvent[];

  const floorEvents = events.filter((e) => e.eventType === "Floor");
  const committeeEvents = events.filter((e) => e.eventType === "Committee");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800">
            United States Senate
          </span>
        </div>
        <h1 className="text-3xl font-bold text-civic-navy mb-2">
          Senate Weekly Schedule
        </h1>
        <p className="text-slate-600">
          Floor sessions, votes, hearings, and committee activity for the
          United States Senate this week.
        </p>
      </div>

      {/* Floor Activity */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-civic-navy mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-red-500" />
          Floor Activity
        </h2>
        <EventList
          events={floorEvents}
          emptyMessage="No Senate floor activity posted for this week."
        />
      </section>

      {/* Committee Activity */}
      <section>
        <h2 className="text-xl font-bold text-civic-navy mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-purple-500" />
          Committee Hearings & Meetings
        </h2>
        <EventList
          events={committeeEvents}
          emptyMessage="No Senate committee hearings scheduled for this week."
        />
      </section>
    </div>
  );
}
