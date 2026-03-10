import EventCard from "./EventCard";
import { formatDateDisplay } from "@/lib/dates";
import type { CongressEvent } from "@/lib/types";

interface EventListProps {
  events: CongressEvent[];
  emptyMessage?: string;
}

export default function EventList({
  events,
  emptyMessage = "No events found for this period.",
}: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-slate-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
        </div>
        <p className="text-slate-500 font-medium">{emptyMessage}</p>
        <p className="text-sm text-slate-400 mt-1">
          The official weekly schedule may not have been posted yet. Check back later.
        </p>
      </div>
    );
  }

  // Group events by date
  const grouped = new Map<string, CongressEvent[]>();
  for (const event of events) {
    const existing = grouped.get(event.date) || [];
    existing.push(event);
    grouped.set(event.date, existing);
  }

  // Sort dates
  const sortedDates = Array.from(grouped.keys()).sort();

  return (
    <div className="space-y-8">
      {sortedDates.map((date) => (
        <div key={date}>
          <h2 className="text-lg font-bold text-civic-navy mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-civic-blue" />
            {formatDateDisplay(date)}
          </h2>
          <div className="space-y-3">
            {grouped.get(date)!.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
