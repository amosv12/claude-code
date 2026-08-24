import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export interface PaperRecord {
  filename: string;
  title: string | null;
  authors: string | null;
  abstract: string | null;
  full_text: string;
  ingested_at: string;
}

export interface PaperMetadataRow {
  id: number;
  filename: string;
  title: string | null;
  authors: string | null;
  abstract: string | null;
  ingested_at: string;
}

const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, '..', 'data', 'papers.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);

db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS papers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    filename    TEXT NOT NULL UNIQUE,
    title       TEXT,
    authors     TEXT,
    abstract    TEXT,
    full_text   TEXT NOT NULL,
    ingested_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS paper_references (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    paper_id          INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    raw_citation_text TEXT NOT NULL
  );
`);

const upsertPaperStmt = db.prepare(`
  INSERT INTO papers (filename, title, authors, abstract, full_text, ingested_at)
  VALUES (@filename, @title, @authors, @abstract, @full_text, @ingested_at)
  ON CONFLICT(filename) DO UPDATE SET
    title       = excluded.title,
    authors     = excluded.authors,
    abstract    = excluded.abstract,
    full_text   = excluded.full_text,
    ingested_at = excluded.ingested_at
`);

const selectPaperIdStmt = db.prepare('SELECT id FROM papers WHERE filename = ?');
const deleteReferencesStmt = db.prepare('DELETE FROM paper_references WHERE paper_id = ?');
const insertReferenceStmt = db.prepare(
  'INSERT INTO paper_references (paper_id, raw_citation_text) VALUES (?, ?)'
);
const selectPapersStmt = db.prepare(
  'SELECT id, filename, title, authors, abstract, ingested_at FROM papers ORDER BY id'
);

/**
 * Writes one paper and its citations atomically. Re-ingesting the same filename
 * updates the row in place and replaces its references rather than duplicating.
 */
export const savePaper = db.transaction((paper: PaperRecord, references: string[]): number => {
  upsertPaperStmt.run(paper);
  const { id } = selectPaperIdStmt.get(paper.filename) as { id: number };
  deleteReferencesStmt.run(id);
  for (const citation of references) {
    insertReferenceStmt.run(id, citation);
  }
  return id;
});

export function listPapers(): PaperMetadataRow[] {
  return selectPapersStmt.all() as PaperMetadataRow[];
}
