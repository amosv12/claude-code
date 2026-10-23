export interface Range {
  min: number
  max: number
}

export interface Targets {
  /** Liquid out ÷ dose in, e.g. 1.8–2.5 means 1:1.8–1:2.5 */
  ratio: Range
  timeS: Range
  extractionYieldPct: Range
  tempC: Range
}

/** Editable defaults; all bounds are inclusive. */
export const DEFAULT_TARGETS: Targets = {
  ratio: { min: 1.8, max: 2.5 },
  timeS: { min: 25, max: 32 },
  extractionYieldPct: { min: 18, max: 22 },
  tempC: { min: 90, max: 96 },
}
