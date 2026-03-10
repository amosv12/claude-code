import { getDb } from "@/lib/db";
import { sourceLogs } from "@/lib/schema";
import { desc } from "drizzle-orm";
import SourcePanel from "@/components/SourcePanel";
import { OFFICIAL_SOURCES } from "@/lib/constants";
import type { SourceLog } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const db = getDb();
  const logs: SourceLog[] = (await db
    .select()
    .from(sourceLogs)
    .orderBy(desc(sourceLogs.fetchedAt))) as SourceLog[];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-civic-navy mb-2">
          Source & Update Log
        </h1>
        <p className="text-slate-600 max-w-2xl">
          Transparency is core to this tool. Below you can see every data
          source we check, when it was last fetched, and what was found. All
          event data comes from official U.S. Congress publications.
        </p>
      </div>

      {/* Official sources reference */}
      <div className="card p-6 mb-8">
        <h2 className="text-lg font-bold text-civic-navy mb-4">
          Official Source Priority
        </h2>
        <div className="space-y-3">
          {Object.entries(OFFICIAL_SOURCES).map(([key, source], index) => (
            <div key={key} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-civic-blue text-white text-xs font-bold flex items-center justify-center mt-0.5">
                {index + 1}
              </span>
              <div>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-civic-blue hover:underline"
                >
                  {source.name}
                </a>
                <p className="text-sm text-slate-500">{source.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fetch history */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-civic-navy mb-4">
          Recent Fetch History
        </h2>
        <SourcePanel logs={logs} />
      </div>

      {/* Data quality notes */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-civic-navy mb-3">
          Data Quality & Methodology
        </h2>
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            <strong>Source priority:</strong> When official sources conflict,
            we prefer the most recently timestamped official source.
          </p>
          <p>
            <strong>Time normalization:</strong> All times are normalized to
            U.S. Eastern Time (ET) regardless of the source format.
          </p>
          <p>
            <strong>Deduplication:</strong> Events are deduplicated based on
            chamber + committee + date + time + title fingerprints to prevent
            duplicate entries from multiple sources.
          </p>
          <p>
            <strong>Status labels:</strong> Events are labeled as Scheduled
            (officially confirmed), Tentative (subject to change), or Expected
            (likely but not confirmed). We never invent data when information
            is missing.
          </p>
          <p>
            <strong>Update frequency:</strong> Sources are checked multiple
            times daily: initial fetch Friday afternoon, follow-up Saturday
            morning, pre-week refresh Sunday evening, and daily updates
            Monday through Thursday.
          </p>
        </div>
      </div>
    </div>
  );
}
