import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const DB_PATH = path.join(process.cwd(), "db", "congress.db");

function createDb() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS congress_events (
      id TEXT PRIMARY KEY,
      chamber TEXT NOT NULL,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      committee_name TEXT,
      date TEXT NOT NULL,
      start_time_et TEXT,
      end_time_et TEXT,
      status TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      source_published_at TEXT,
      source_retrieved_at TEXT NOT NULL,
      location TEXT,
      bill_reference TEXT,
      notes TEXT,
      confidence_level TEXT NOT NULL,
      week_start_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS source_logs (
      id TEXT PRIMARY KEY,
      source_name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      status TEXT NOT NULL,
      events_found INTEGER NOT NULL,
      notes TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_events_week ON congress_events(week_start_date);
    CREATE INDEX IF NOT EXISTS idx_events_chamber ON congress_events(chamber);
    CREATE INDEX IF NOT EXISTS idx_events_date ON congress_events(date);
    CREATE INDEX IF NOT EXISTS idx_events_type ON congress_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_source_logs_fetched ON source_logs(fetched_at);
  `);

  return drizzle(sqlite, { schema });
}

// Singleton pattern for the database connection
let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}
