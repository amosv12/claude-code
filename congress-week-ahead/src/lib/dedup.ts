import type { CongressEvent } from "./types";

/**
 * Generate a fingerprint for deduplication.
 * Based on: chamber + committee + date + normalized time + normalized title.
 */
export function eventFingerprint(event: Pick<CongressEvent, "chamber" | "committeeName" | "date" | "startTimeET" | "title">): string {
  const parts = [
    event.chamber.toLowerCase(),
    (event.committeeName || "floor").toLowerCase().replace(/[^a-z]/g, ""),
    event.date,
    event.startTimeET || "tbd",
    event.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 60),
  ];
  return parts.join("|");
}

/**
 * Deduplicate events by fingerprint. When duplicates exist, prefer
 * the event with the most recent sourceRetrievedAt timestamp.
 */
export function deduplicateEvents(events: CongressEvent[]): CongressEvent[] {
  const seen = new Map<string, CongressEvent>();

  for (const event of events) {
    const fp = eventFingerprint(event);
    const existing = seen.get(fp);

    if (!existing) {
      seen.set(fp, event);
    } else if (event.sourceRetrievedAt > existing.sourceRetrievedAt) {
      seen.set(fp, event);
    }
  }

  return Array.from(seen.values());
}
