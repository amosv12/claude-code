import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sourceLogs } from "@/lib/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const results = await db
    .select()
    .from(sourceLogs)
    .orderBy(desc(sourceLogs.fetchedAt));

  return NextResponse.json(results);
}
