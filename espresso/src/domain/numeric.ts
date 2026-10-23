/**
 * Parses user-typed decimals, accepting "," or "." as the separator.
 * Returns null for empty or malformed input (so callers can show a validation error).
 */
export function parseDecimal(input: string): number | null {
  const s = input.trim()
  if (!/^\d*[.,]?\d*$/.test(s) || !/\d/.test(s)) return null
  return Number(s.replace(',', '.'))
}

export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals
  return Math.round((value + Number.EPSILON) * f) / f
}

/** Grams to 0.1 g, e.g. 18 → "18.0". */
export function formatGrams(g: number): string {
  return roundTo(g, 1).toFixed(1)
}

/** Ratio as "1:2.0". */
export function formatRatio(r: number): string {
  return `1:${roundTo(r, 1).toFixed(1)}`
}
