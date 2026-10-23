/**
 * Elapsed time is always derived from wall-clock timestamps, never from counting
 * interval ticks, so it stays correct when the screen locks or the tab is throttled.
 */
export function elapsedMs(startedAt: number, now: number): number {
  return Math.max(0, now - startedAt)
}

/** Seconds rounded to 0.1 s, for storing as Shot.timeS. */
export function toSeconds(ms: number): number {
  return Math.round(ms / 100) / 10
}

/** "28.4" — seconds with one decimal; switches to "1:05.2" past a minute. */
export function formatElapsed(ms: number): string {
  const tenths = Math.floor(Math.max(0, ms) / 100)
  const totalS = Math.floor(tenths / 10)
  const t = tenths % 10
  if (totalS < 60) return `${totalS}.${t}`
  const m = Math.floor(totalS / 60)
  const s = totalS % 60
  return `${m}:${String(s).padStart(2, '0')}.${t}`
}

/**
 * Restores a running timer's start time from storage. Returns null when the value is
 * missing, malformed, in the future, or so old the shot can't still be running.
 */
export function parseStoredStart(raw: string | null, now: number, maxAgeMs = 10 * 60_000): number | null {
  if (raw === null) return null
  const t = Number(raw)
  if (!Number.isFinite(t) || t <= 0 || t > now || now - t > maxAgeMs) return null
  return t
}
