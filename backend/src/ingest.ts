import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';
import { savePaper } from './db';
import { extractMetadata, extractReferences, ReferenceStyle } from './extract';

export interface IngestFailure {
  filename: string;
  reason: string;
}

export interface IngestResult {
  processed: number;
  references_extracted: number;
  failures: IngestFailure[];
}

/** Per-paper diagnostics, logged so extraction quality stays visible across a run. */
interface PaperDiagnostics {
  filename: string;
  title: boolean;
  authors: boolean;
  abstract: boolean;
  style: ReferenceStyle;
  citations: number;
  medianCitationLength: number;
}

export const PAPERS_DIR = process.env.PAPERS_DIR ?? path.join(__dirname, '..', 'data', 'papers');

/** Below this, a PDF is image-only scan rather than a text document we can use. */
const MIN_TEXT_LENGTH = 200;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

interface ParsedPdf {
  text: string;
  firstPageText: string;
}

async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = result.text ?? '';
    // pages are 1-based; fall back to the head of the document for odd PDFs
    // that yield no page-wise split.
    const firstPage = result.pages.length > 0 ? result.getPageText(1) : '';
    return { text, firstPageText: firstPage.trim().length > 0 ? firstPage : text.slice(0, 4000) };
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

export async function ingestAll(): Promise<IngestResult> {
  const failures: IngestFailure[] = [];
  const diagnostics: PaperDiagnostics[] = [];
  let processed = 0;
  let referencesExtracted = 0;

  let filenames: string[];
  try {
    filenames = fs
      .readdirSync(PAPERS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'))
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    throw new Error(`cannot read papers directory ${PAPERS_DIR}: ${errorMessage(error)}`);
  }

  console.log(`[ingest] scanning ${PAPERS_DIR} - ${filenames.length} PDF(s)`);

  for (const filename of filenames) {
    const filePath = path.join(PAPERS_DIR, filename);

    // Every file is isolated: a failure here is recorded and the run continues.
    try {
      const buffer = await fs.promises.readFile(filePath);

      let parsed: ParsedPdf;
      try {
        parsed = await parsePdf(buffer);
      } catch (error) {
        failures.push({ filename, reason: `pdf parse error: ${errorMessage(error)}` });
        console.warn(`[ingest] ${filename}: pdf parse error - ${errorMessage(error)}`);
        continue;
      }

      if (parsed.text.trim().length < MIN_TEXT_LENGTH) {
        failures.push({ filename, reason: 'no extractable text (likely a scanned image PDF)' });
        console.warn(`[ingest] ${filename}: no extractable text`);
        continue;
      }

      const metadata = extractMetadata(parsed.firstPageText);
      const references = extractReferences(parsed.text);

      savePaper(
        {
          filename,
          title: metadata.title,
          authors: metadata.authors,
          abstract: metadata.abstract,
          full_text: parsed.text,
          ingested_at: new Date().toISOString(),
        },
        references.citations
      );

      processed += 1;
      referencesExtracted += references.citations.length;

      diagnostics.push({
        filename,
        title: metadata.title !== null,
        authors: metadata.authors !== null,
        abstract: metadata.abstract !== null,
        style: references.style,
        citations: references.citations.length,
        medianCitationLength: median(references.citations.map((c) => c.length)),
      });

      const missing = (['title', 'authors', 'abstract'] as const).filter(
        (field) => metadata[field] === null
      );
      const missingNote = missing.length > 0 ? ` (no ${missing.join('/')})` : '';
      console.log(
        `[ingest] ${filename}: ${references.citations.length} reference(s), ` +
          `style=${references.style}${missingNote}`
      );
    } catch (error) {
      failures.push({ filename, reason: `ingestion error: ${errorMessage(error)}` });
      console.warn(`[ingest] ${filename}: ingestion error - ${errorMessage(error)}`);
    }
  }

  reportExtractionQuality(diagnostics);

  return { processed, references_extracted: referencesExtracted, failures };
}

/**
 * Surfaces papers whose references parsed implausibly, so degraded extraction is
 * reported rather than passing silently as a successful run.
 */
function reportExtractionQuality(diagnostics: PaperDiagnostics[]): void {
  if (diagnostics.length === 0) return;

  const suspect = diagnostics.filter(
    (d) =>
      (d.style !== 'none' && d.citations <= 2) ||
      (d.citations > 0 && d.medianCitationLength < 30)
  );
  const styles = [...new Set(diagnostics.map((d) => d.style))];

  console.log(`[ingest] reference styles seen: ${styles.join(', ')}`);
  for (const d of suspect) {
    console.warn(
      `[ingest] SUSPECT ${d.filename}: ${d.citations} citation(s), ` +
        `median length ${d.medianCitationLength}, style=${d.style}`
    );
  }
}
