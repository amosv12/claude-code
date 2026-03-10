import { NextResponse } from "next/server";

/**
 * POST /api/ingest
 * Trigger manual data ingestion from all official sources.
 * In production, this would call each scraper module.
 */
export async function POST() {
  // In production, this would:
  // 1. Call each scraper module (house-floor, house-committee, senate-floor, senate-hearings)
  // 2. Normalize results into CongressEvent format
  // 3. Deduplicate against existing events
  // 4. Insert/update the database
  // 5. Log results to source_logs

  return NextResponse.json({
    message: "Ingestion triggered",
    status: "stub",
    note: "Live ingestion requires configuring scraper modules with official source access. See src/scrapers/ for the modular fetcher architecture.",
    sources: [
      { name: "House Majority Leader", status: "stub" },
      { name: "House Committee Schedule", status: "stub" },
      { name: "Senate Floor Schedule", status: "stub" },
      { name: "Senate Hearings & Meetings", status: "stub" },
    ],
  });
}
