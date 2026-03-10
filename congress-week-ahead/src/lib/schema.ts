import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const congressEvents = sqliteTable("congress_events", {
  id: text("id").primaryKey(),
  chamber: text("chamber").notNull(),
  eventType: text("event_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  committeeName: text("committee_name"),
  date: text("date").notNull(),
  startTimeET: text("start_time_et"),
  endTimeET: text("end_time_et"),
  status: text("status").notNull(),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourcePublishedAt: text("source_published_at"),
  sourceRetrievedAt: text("source_retrieved_at").notNull(),
  location: text("location"),
  billReference: text("bill_reference"),
  notes: text("notes"),
  confidenceLevel: text("confidence_level").notNull(),
  weekStartDate: text("week_start_date").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const sourceLogs = sqliteTable("source_logs", {
  id: text("id").primaryKey(),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url").notNull(),
  fetchedAt: text("fetched_at").notNull(),
  status: text("status").notNull(),
  eventsFound: integer("events_found").notNull(),
  notes: text("notes"),
});
