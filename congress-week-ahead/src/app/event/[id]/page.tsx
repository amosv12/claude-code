import { getDb } from "@/lib/db";
import { congressEvents } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import ChamberBadge from "@/components/ChamberBadge";
import { formatDateDisplay, formatTimeDisplay } from "@/lib/dates";
import type { CongressEvent } from "@/lib/types";
import type { Chamber, EventStatus, ConfidenceLevel } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const db = getDb();

  const results = (await db
    .select()
    .from(congressEvents)
    .where(eq(congressEvents.id, params.id))
    .limit(1)) as CongressEvent[];

  if (results.length === 0) notFound();

  const event = results[0];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-civic-blue hover:underline mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back to Week Ahead
      </Link>

      <div className="card p-6 sm:p-8">
        {/* Header badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <ChamberBadge chamber={event.chamber as Chamber} />
          <span className="text-xs font-medium text-slate-500 uppercase">
            {event.eventType}
          </span>
          <StatusBadge status={event.status as EventStatus} />
          <ConfidenceBadge level={event.confidenceLevel as ConfidenceLevel} />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-civic-navy mb-2">
          {event.title}
        </h1>

        {event.committeeName && (
          <p className="text-lg text-civic-blue font-medium mb-4">
            {event.committeeName} Committee
          </p>
        )}

        {/* Description */}
        <p className="text-slate-700 mb-6 leading-relaxed">
          {event.description}
        </p>

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <DetailItem label="Date" value={formatDateDisplay(event.date)} />
          <DetailItem
            label="Time (ET)"
            value={
              event.startTimeET
                ? `${formatTimeDisplay(event.startTimeET)}${
                    event.endTimeET
                      ? ` – ${formatTimeDisplay(event.endTimeET)}`
                      : ""
                  }`
                : "Time TBD"
            }
          />
          <DetailItem label="Location" value={event.location || "TBD"} />
          <DetailItem label="Chamber" value={event.chamber} />
          {event.billReference && (
            <DetailItem label="Bill / Nomination" value={event.billReference} />
          )}
          <DetailItem label="Status" value={event.status} />
          <DetailItem
            label="Confidence Level"
            value={event.confidenceLevel}
          />
        </div>

        {/* Notes */}
        {event.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-amber-800 mb-1">Notes</h3>
            <p className="text-sm text-amber-700">{event.notes}</p>
          </div>
        )}

        {/* Source attribution */}
        <div className="border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-600 mb-2">
            Source Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-500">
            <div>
              <span className="font-medium">Source:</span>{" "}
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-civic-blue hover:underline"
              >
                {event.sourceName}
              </a>
            </div>
            {event.sourcePublishedAt && (
              <div>
                <span className="font-medium">Published:</span>{" "}
                {new Date(event.sourcePublishedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            )}
            <div>
              <span className="font-medium">Retrieved:</span>{" "}
              {new Date(event.sourceRetrievedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </dt>
      <dd className="text-sm font-medium text-slate-900 mt-0.5">{value}</dd>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const styles: Record<ConfidenceLevel, string> = {
    High: "bg-emerald-50 text-emerald-700",
    Medium: "bg-amber-50 text-amber-700",
    Low: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[level]}`}
    >
      {level} confidence
    </span>
  );
}
