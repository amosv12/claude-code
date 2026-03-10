import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { congressEvents } from "@/lib/schema";
import { eq, and, like, or, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const week = params.get("week");
  const chamber = params.get("chamber");
  const eventType = params.get("eventType");
  const status = params.get("status");
  const committee = params.get("committee");
  const search = params.get("search");

  const db = getDb();

  const conditions = [];

  if (week) conditions.push(eq(congressEvents.weekStartDate, week));
  if (chamber) conditions.push(eq(congressEvents.chamber, chamber));
  if (eventType) conditions.push(eq(congressEvents.eventType, eventType));
  if (status) conditions.push(eq(congressEvents.status, status));
  if (committee) conditions.push(like(congressEvents.committeeName, `%${committee}%`));
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

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const results = await db
    .select()
    .from(congressEvents)
    .where(where)
    .orderBy(asc(congressEvents.date), asc(congressEvents.startTimeET));

  return NextResponse.json(results);
}
