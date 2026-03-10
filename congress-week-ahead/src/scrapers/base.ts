import type { CongressEvent, SourceLog } from "@/lib/types";

/**
 * Base interface for all congressional data fetchers.
 * Each source family implements this interface.
 */
export interface SourceFetcher {
  /** Human-readable name of the source */
  readonly sourceName: string;

  /** Base URL of the official source */
  readonly sourceUrl: string;

  /**
   * Fetch and parse events from this source.
   * Returns raw events before deduplication.
   */
  fetch(weekStartDate: string): Promise<FetchResult>;
}

export interface FetchResult {
  events: CongressEvent[];
  log: SourceLog;
}

/**
 * Base class with common utilities for fetchers.
 */
export abstract class BaseFetcher implements SourceFetcher {
  abstract readonly sourceName: string;
  abstract readonly sourceUrl: string;

  abstract fetch(weekStartDate: string): Promise<FetchResult>;

  /**
   * Safely fetch a URL with timeout and error handling.
   */
  protected async safeFetch(
    url: string,
    timeoutMs: number = 30000
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "CongressWeekAhead/1.0 (civic-tech; educational use)",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Create a source log entry.
   */
  protected createLog(
    eventsFound: number,
    status: "Success" | "Failed" | "Partial",
    notes: string | null = null
  ): Omit<SourceLog, "id"> {
    return {
      sourceName: this.sourceName,
      sourceUrl: this.sourceUrl,
      fetchedAt: new Date().toISOString(),
      status,
      eventsFound,
      notes,
    };
  }
}
