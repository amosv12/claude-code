import { HouseFloorFetcher } from "./house-floor";
import { HouseCommitteeFetcher } from "./house-committee";
import { SenateFloorFetcher } from "./senate-floor";
import { SenateHearingsFetcher } from "./senate-hearings";
import { deduplicateEvents } from "@/lib/dedup";
import { getNextWeekStart } from "@/lib/dates";
import type { SourceFetcher } from "./base";
import type { CongressEvent, SourceLog } from "@/lib/types";

/**
 * Scheduler / orchestrator for congressional data ingestion.
 *
 * Architecture:
 * - Each source has its own fetcher module implementing SourceFetcher
 * - The scheduler runs all fetchers, collects results, deduplicates, and stores
 * - In production, this would be triggered by a cron job (e.g., every 4 hours)
 *
 * Recommended cron schedule:
 * - Friday 5:00 PM ET: Initial fetch (House schedule typically posted Friday afternoon)
 * - Saturday 10:00 AM ET: Follow-up fetch
 * - Sunday 6:00 PM ET: Pre-week refresh
 * - Mon–Thu 8:00 AM ET: Daily morning update
 * - Mon–Thu 2:00 PM ET: Afternoon update for schedule changes
 *
 * Cron integration options:
 * - Node.js: node-cron or Bree
 * - System: Linux crontab
 * - Cloud: AWS EventBridge, Vercel Cron, Railway Cron
 * - Serverless: Next.js API route + external cron service (cron-job.org, EasyCron)
 */

const FETCHERS: SourceFetcher[] = [
  new HouseFloorFetcher(),
  new HouseCommitteeFetcher(),
  new SenateFloorFetcher(),
  new SenateHearingsFetcher(),
];

export interface IngestionResult {
  totalEventsIngested: number;
  totalDeduplicated: number;
  sourceLogs: SourceLog[];
  errors: string[];
}

/**
 * Run all fetchers and return deduplicated events.
 */
export async function runIngestion(
  weekStartDate?: string
): Promise<IngestionResult> {
  const week = weekStartDate || getNextWeekStart();
  const allEvents: CongressEvent[] = [];
  const allLogs: SourceLog[] = [];
  const errors: string[] = [];

  // Run all fetchers concurrently
  const results = await Promise.allSettled(
    FETCHERS.map((fetcher) => fetcher.fetch(week))
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const fetcherName = FETCHERS[i].sourceName;

    if (result.status === "fulfilled") {
      allEvents.push(...result.value.events);
      allLogs.push(result.value.log);
    } else {
      errors.push(`${fetcherName}: ${result.reason}`);
      allLogs.push({
        id: crypto.randomUUID(),
        sourceName: fetcherName,
        sourceUrl: FETCHERS[i].sourceUrl,
        fetchedAt: new Date().toISOString(),
        status: "Failed",
        eventsFound: 0,
        notes: `Unhandled error: ${result.reason}`,
      });
    }
  }

  // Deduplicate across all sources
  const deduplicated = deduplicateEvents(allEvents);

  return {
    totalEventsIngested: deduplicated.length,
    totalDeduplicated: allEvents.length - deduplicated.length,
    sourceLogs: allLogs,
    errors,
  };
}

// CLI entry point
if (require.main === module) {
  runIngestion()
    .then((result) => {
      console.log("Ingestion complete:");
      console.log(`  Events: ${result.totalEventsIngested}`);
      console.log(`  Deduplicated: ${result.totalDeduplicated}`);
      console.log(`  Errors: ${result.errors.length}`);
      result.sourceLogs.forEach((log) => {
        console.log(`  [${log.status}] ${log.sourceName}: ${log.eventsFound} events`);
      });
    })
    .catch(console.error);
}
