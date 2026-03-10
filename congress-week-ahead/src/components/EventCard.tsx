import Link from "next/link";
import StatusBadge from "./StatusBadge";
import ChamberBadge from "./ChamberBadge";
import { formatTimeDisplay } from "@/lib/dates";
import type { CongressEvent } from "@/lib/types";
import type { Chamber, EventStatus } from "@/lib/constants";

export default function EventCard({ event }: { event: CongressEvent }) {
  return (
    <Link href={`/event/${event.id}`} className="block">
      <div className="card p-4 hover:border-civic-blue/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <ChamberBadge chamber={event.chamber as Chamber} />
              <span className="text-xs font-medium text-slate-500 uppercase">
                {event.eventType}
              </span>
              <StatusBadge status={event.status as EventStatus} />
            </div>

            <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">
              {event.title}
            </h3>

            {event.committeeName && (
              <p className="text-sm text-civic-blue font-medium mb-1">
                {event.committeeName} Committee
              </p>
            )}

            <p className="text-sm text-slate-600 line-clamp-2 mb-2">
              {event.description}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <ClockIcon />
                {formatTimeDisplay(event.startTimeET)}
                {event.endTimeET && ` – ${formatTimeDisplay(event.endTimeET)}`}
              </span>

              {event.location && (
                <span className="flex items-center gap-1">
                  <LocationIcon />
                  {event.location}
                </span>
              )}

              {event.billReference && (
                <span className="font-medium text-civic-navy bg-slate-100 px-2 py-0.5 rounded">
                  {event.billReference}
                </span>
              )}
            </div>

            {event.notes && (
              <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded mt-2">
                {event.notes}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ClockIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}
