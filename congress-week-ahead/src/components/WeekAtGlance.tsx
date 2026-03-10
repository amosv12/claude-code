import type { WeekSummary } from "@/lib/types";

export default function WeekAtGlance({ summary }: { summary: WeekSummary }) {
  return (
    <div className="card p-6 mb-8">
      <h2 className="text-lg font-bold text-civic-navy mb-4">
        Week at a Glance
        <span className="text-sm font-normal text-slate-500 ml-2">
          {formatWeekRange(summary.weekStartDate, summary.weekEndDate)}
        </span>
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SessionCard
          chamber="House"
          inSession={summary.houseInSession}
          color="blue"
        />
        <SessionCard
          chamber="Senate"
          inSession={summary.senateInSession}
          color="red"
        />
        <StatCard
          label="Committee Hearings"
          value={summary.totalCommitteeHearings}
          color="purple"
        />
        <StatCard
          label="Total Events"
          value={summary.totalEvents}
          color="slate"
        />
      </div>

      {summary.majorFloorItems.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
            Major Expected Floor Items
          </h3>
          <ul className="space-y-1">
            {summary.majorFloorItems.map((item, i) => (
              <li
                key={i}
                className="text-sm text-slate-600 flex items-start gap-2"
              >
                <span className="text-civic-blue mt-1">&#9654;</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SessionCard({
  chamber,
  inSession,
  color,
}: {
  chamber: string;
  inSession: boolean;
  color: string;
}) {
  return (
    <div
      className={`rounded-lg p-4 ${
        inSession ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50 border border-slate-200"
      }`}
    >
      <p className="text-sm font-medium text-slate-600">{chamber}</p>
      <p
        className={`text-lg font-bold ${
          inSession ? "text-emerald-700" : "text-slate-400"
        }`}
      >
        {inSession ? "In Session" : "Not in Session"}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg p-4 bg-slate-50 border border-slate-200">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="text-2xl font-bold text-civic-navy">{value}</p>
    </div>
  );
}

function formatWeekRange(start: string, end: string): string {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}
