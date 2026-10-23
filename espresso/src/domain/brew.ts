import { DEFAULT_TARGETS, type Range, type Targets } from './targets'

export type Flag = 'low' | 'ok' | 'high'

export interface ShotMetricsInput {
  doseG: number
  yieldG: number
  timeS: number
  tempC?: number
  tdsPct?: number
}

export interface ShotFlags {
  ratio: Flag
  time: Flag
  /** Absent when no TDS was measured. */
  ey?: Flag
  /** Absent when no temperature was logged. */
  temp?: Flag
}

/** Tolerance so values sitting exactly on a bound don't flip due to float error (e.g. 32.4 / 18). */
const EPSILON = 1e-9

const MS_PER_DAY = 86_400_000

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number, got ${value}`)
  }
}

/** Liquid ratio: yieldG / doseG. 2 means 1:2. */
export function ratio(doseG: number, yieldG: number): number {
  assertPositiveFinite(doseG, 'doseG')
  return yieldG / doseG
}

/**
 * Whole calendar days from roastDate (YYYY-MM-DD) to the local calendar day of
 * createdAt (epoch ms). Calendar-based, so DST changes never shift the result.
 * Negative if the shot predates the roast date.
 */
export function daysOffRoast(createdAt: number, roastDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(roastDate)
  if (!match) throw new RangeError(`roastDate must be YYYY-MM-DD, got "${roastDate}"`)
  const [, y, m, d] = match
  const roastDay = Date.UTC(Number(y), Number(m) - 1, Number(d))
  const shot = new Date(createdAt)
  if (Number.isNaN(shot.getTime())) throw new RangeError(`createdAt is not a valid timestamp: ${createdAt}`)
  const shotDay = Date.UTC(shot.getFullYear(), shot.getMonth(), shot.getDate())
  return Math.round((shotDay - roastDay) / MS_PER_DAY)
}

/** Extraction yield %: (yieldG × tdsPct) / doseG. Undefined when no TDS was measured. */
export function extractionYield(doseG: number, yieldG: number, tdsPct?: number): number | undefined {
  if (tdsPct === undefined) return undefined
  assertPositiveFinite(doseG, 'doseG')
  return (yieldG * tdsPct) / doseG
}

function flagFor(value: number, range: Range): Flag {
  if (value < range.min - EPSILON) return 'low'
  if (value > range.max + EPSILON) return 'high'
  return 'ok'
}

/** Per-metric low/ok/high flags against the targets (inclusive bounds). */
export function classifyShot(input: ShotMetricsInput, targets: Targets = DEFAULT_TARGETS): ShotFlags {
  const flags: ShotFlags = {
    ratio: flagFor(ratio(input.doseG, input.yieldG), targets.ratio),
    time: flagFor(input.timeS, targets.timeS),
  }
  const ey = extractionYield(input.doseG, input.yieldG, input.tdsPct)
  if (ey !== undefined) flags.ey = flagFor(ey, targets.extractionYieldPct)
  if (input.tempC !== undefined) flags.temp = flagFor(input.tempC, targets.tempC)
  return flags
}

export type Metric = 'ratio' | 'time' | 'ey' | 'temp'

export interface OutOfTarget {
  metric: Metric
  flag: 'low' | 'high'
}

/** Only the metrics that missed their target, in display order. */
export function outOfTarget(flags: ShotFlags): OutOfTarget[] {
  const out: OutOfTarget[] = []
  const entries: [Metric, Flag | undefined][] = [
    ['ratio', flags.ratio],
    ['time', flags.time],
    ['ey', flags.ey],
    ['temp', flags.temp],
  ]
  for (const [metric, flag] of entries) {
    if (flag === 'low' || flag === 'high') out.push({ metric, flag })
  }
  return out
}
