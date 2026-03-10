import { getDb } from "@/lib/db";
import { congressEvents } from "@/lib/schema";
import { like, or, and, eq, asc } from "drizzle-orm";
import SearchBar from "@/components/SearchBar";
import FilterBar from "@/components/FilterBar";
import EventList from "@/components/EventList";
import type { CongressEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const db = getDb();
  const search = searchParams.search || "";
  const chamber = searchParams.chamber || "";
  const eventType = searchParams.eventType || "";
  const status = searchParams.status || "";

  const conditions = [];

  if (search) {
    conditions.push(
      or(
        like(congressEvents.title, `%${search}%`),
        like(congressEvents.description, `%${search}%`),
        like(congressEvents.committeeName, `%${search}%`),
        like(congressEvents.billReference, `%${search}%`)
      )!
    );
  }

  if (chamber) conditions.push(eq(congressEvents.chamber, chamber));
  if (eventType) conditions.push(eq(congressEvents.eventType, eventType));
  if (status) conditions.push(eq(congressEvents.status, status));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const events: CongressEvent[] = (await db
    .select()
    .from(congressEvents)
    .where(where)
    .orderBy(asc(congressEvents.date), asc(congressEvents.startTimeET))) as CongressEvent[];

  const hasFilters = search || chamber || eventType || status;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-civic-navy mb-2">
          Search & Filter
        </h1>
        <p className="text-slate-600">
          Find specific bills, hearings, committees, or keywords across all
          congressional events.
        </p>
      </div>

      <div className="mb-6">
        <SearchBar />
      </div>

      <FilterBar />

      {hasFilters && (
        <p className="text-sm text-slate-500 mb-4">
          Found <span className="font-semibold">{events.length}</span> event
          {events.length !== 1 ? "s" : ""}
          {search && (
            <>
              {" "}matching &ldquo;<span className="font-medium">{search}</span>&rdquo;
            </>
          )}
        </p>
      )}

      {hasFilters ? (
        <EventList
          events={events}
          emptyMessage={`No events found${
            search ? ` matching "${search}"` : ""
          }. Try adjusting your filters.`}
        />
      ) : (
        <div className="card p-8 text-center">
          <p className="text-slate-500 font-medium">
            Use the search bar or filters above to find congressional events.
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Search by bill number, committee name, hearing topic, or keyword.
          </p>
        </div>
      )}
    </div>
  );
}
