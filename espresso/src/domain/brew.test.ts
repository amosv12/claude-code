import { describe, expect, it } from 'vitest'
import { classifyShot, daysOffRoast, extractionYield, outOfTarget, ratio } from './brew'
import { DEFAULT_TARGETS } from './targets'

describe('ratio', () => {
  it('divides yield by dose', () => {
    expect(ratio(18, 36)).toBe(2)
    expect(ratio(18, 45)).toBe(2.5)
    expect(ratio(20, 30)).toBe(1.5)
  })

  it('rejects a non-positive or non-finite dose', () => {
    expect(() => ratio(0, 36)).toThrow(RangeError)
    expect(() => ratio(-1, 36)).toThrow(RangeError)
    expect(() => ratio(Number.NaN, 36)).toThrow(RangeError)
  })
})

describe('daysOffRoast', () => {
  const at = (y: number, mo: number, d: number, h = 12) => new Date(y, mo - 1, d, h).getTime()

  it('is 0 on the roast day, regardless of time of day', () => {
    expect(daysOffRoast(at(2025, 3, 10, 0), '2025-03-10')).toBe(0)
    expect(daysOffRoast(new Date(2025, 2, 10, 23, 59).getTime(), '2025-03-10')).toBe(0)
  })

  it('counts calendar days', () => {
    expect(daysOffRoast(at(2025, 3, 24), '2025-03-10')).toBe(14)
    expect(daysOffRoast(at(2026, 1, 1), '2025-12-25')).toBe(7)
  })

  it('is not shifted by daylight-saving changes', () => {
    // Spans both the US spring-forward and autumn fall-back dates.
    expect(daysOffRoast(at(2025, 3, 10, 0), '2025-03-08')).toBe(2)
    expect(daysOffRoast(at(2025, 11, 3, 0), '2025-10-30')).toBe(4)
  })

  it('handles leap days', () => {
    expect(daysOffRoast(at(2024, 3, 1), '2024-02-28')).toBe(2)
    expect(daysOffRoast(at(2025, 3, 1), '2025-02-28')).toBe(1)
  })

  it('is negative if the shot predates the roast date', () => {
    expect(daysOffRoast(at(2025, 3, 8), '2025-03-10')).toBe(-2)
  })

  it('rejects malformed input', () => {
    expect(() => daysOffRoast(Date.now(), '10/03/2025')).toThrow(RangeError)
    expect(() => daysOffRoast(Number.NaN, '2025-03-10')).toThrow(RangeError)
  })
})

describe('extractionYield', () => {
  it('is yield × TDS ÷ dose', () => {
    expect(extractionYield(18, 36, 9)).toBeCloseTo(18, 10)
    expect(extractionYield(18, 40, 8.5)).toBeCloseTo(18.888888, 5)
  })

  it('is undefined without TDS', () => {
    expect(extractionYield(18, 36)).toBeUndefined()
    expect(extractionYield(18, 36, undefined)).toBeUndefined()
  })

  it('rejects a non-positive dose when TDS is present', () => {
    expect(() => extractionYield(0, 36, 9)).toThrow(RangeError)
  })
})

describe('classifyShot', () => {
  const good = { doseG: 18, yieldG: 36, timeS: 28 }

  it('flags an in-range shot as ok; omits ey/temp when not measured', () => {
    expect(classifyShot(good)).toEqual({ ratio: 'ok', time: 'ok' })
  })

  it('flags ratio low/high', () => {
    expect(classifyShot({ ...good, yieldG: 30 }).ratio).toBe('low') // 1:1.67
    expect(classifyShot({ ...good, yieldG: 50 }).ratio).toBe('high') // 1:2.78
  })

  it('flags time low/high', () => {
    expect(classifyShot({ ...good, timeS: 18 }).time).toBe('low')
    expect(classifyShot({ ...good, timeS: 41 }).time).toBe('high')
  })

  it('flags extraction yield when TDS is present', () => {
    expect(classifyShot({ ...good, tdsPct: 7 }).ey).toBe('low') // 14 %
    expect(classifyShot({ ...good, tdsPct: 9 }).ey).toBe('ok') // 18 %
    expect(classifyShot({ ...good, tdsPct: 12 }).ey).toBe('high') // 24 %
  })

  it('flags temperature when present', () => {
    expect(classifyShot({ ...good, tempC: 85 }).temp).toBe('low')
    expect(classifyShot({ ...good, tempC: 93 }).temp).toBe('ok')
    expect(classifyShot({ ...good, tempC: 98 }).temp).toBe('high')
  })

  it('treats bounds as inclusive', () => {
    expect(classifyShot({ doseG: 20, yieldG: 36, timeS: 25, tempC: 90 })).toMatchObject({
      ratio: 'ok', // exactly 1:1.8
      time: 'ok',
      temp: 'ok',
    })
    expect(classifyShot({ doseG: 18, yieldG: 45, timeS: 32, tempC: 96 })).toMatchObject({
      ratio: 'ok', // exactly 1:2.5
      time: 'ok',
      temp: 'ok',
    })
  })

  it('is not fooled by float error on a bound (32.4 / 18 is 1.8 in spirit)', () => {
    expect(classifyShot({ doseG: 18, yieldG: 32.4, timeS: 28 }).ratio).toBe('ok')
  })

  it('uses custom targets when given', () => {
    const strict = { ...DEFAULT_TARGETS, timeS: { min: 28, max: 30 } }
    expect(classifyShot({ ...good, timeS: 26 }, strict).time).toBe('low')
    expect(classifyShot({ ...good, timeS: 26 }).time).toBe('ok')
  })
})

describe('outOfTarget', () => {
  it('lists only metrics outside target, in display order', () => {
    expect(outOfTarget({ ratio: 'ok', time: 'ok' })).toEqual([])
    expect(outOfTarget({ ratio: 'high', time: 'ok', ey: 'low', temp: 'ok' })).toEqual([
      { metric: 'ratio', flag: 'high' },
      { metric: 'ey', flag: 'low' },
    ])
    expect(outOfTarget({ ratio: 'low', time: 'high', temp: 'high' })).toEqual([
      { metric: 'ratio', flag: 'low' },
      { metric: 'time', flag: 'high' },
      { metric: 'temp', flag: 'high' },
    ])
  })
})
