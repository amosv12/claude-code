import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { congressEvents } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const results = await db
    .select()
    .from(congressEvents)
    .where(eq(congressEvents.id, params.id))
    .limit(1);

  if (results.length === 0) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(results[0]);
}
