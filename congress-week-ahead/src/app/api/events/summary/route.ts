import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { congressEvents } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getNextWeekStart, getNextWeekEnd } from "@/lib/dates";
import type { WeekSummary } from "@/lib/types";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const week = params.get("week") || getNextWeekStart();

  const db = getDb();

  const allEvents = await db
    .select()
    .from(congressEvents)
    .where(eq(congressEvents.weekStartDate, week));

  const houseFloorEvents = allEvents.filter(
    (e) => e.chamber === "House" && e.eventType === "Floor"
  );
  const senateFloorEvents = allEvents.filter(
    (e) => e.chamber === "Senate" && e.eventType === "Floor"
  );
  const committeeEvents = allEvents.filter((e) => e.eventType === "Committee");

  const majorFloorItems = allEvents
    .filter(
      (e) =>
        e.eventType === "Floor" &&
        e.billReference &&
        (e.status === "Scheduled" || e.status === "Expected")
    )
    .map((e) => `${e.chamber}: ${e.title}`)
    .slice(0, 5);

  const weekEnd = new Date(week + "T12:00:00");
  weekEnd.setDate(weekEnd.getDate() + 4);

  const summary: WeekSummary = {
    weekStartDate: week,
    weekEndDate: weekEnd.toISOString().split("T")[0],
    houseInSession: houseFloorEvents.length > 0,
    senateInSession: senateFloorEvents.length > 0,
    majorFloorItems,
    totalCommitteeHearings: committeeEvents.length,
    totalEvents: allEvents.length,
    lastUpdated: new Date().toISOString(),
  };

  return NextResponse.json(summary);
}
