import { describe, expect, it } from 'vitest'
import { formatGrams, formatRatio, parseDecimal, roundTo } from './numeric'

describe('parseDecimal', () => {
  it('accepts dot and comma separators', () => {
    expect(parseDecimal('18.5')).toBe(18.5)
    expect(parseDecimal('18,5')).toBe(18.5)
    expect(parseDecimal(' 36 ')).toBe(36)
    expect(parseDecimal(',5')).toBe(0.5)
    expect(parseDecimal('7.')).toBe(7)
  })

  it('rejects empty and malformed input', () => {
    for (const bad of ['', ' ', '.', ',', 'abc', '1.2.3', '1,2,3', '1,2.3', '-5', '1e3', '18 g']) {
      expect(parseDecimal(bad), bad).toBeNull()
    }
  })
})

describe('roundTo', () => {
  it('rounds half away from zero on decimal boundaries', () => {
    expect(roundTo(1.005, 2)).toBe(1.01)
    expect(roundTo(18.04, 1)).toBe(18)
    expect(roundTo(18.05, 1)).toBe(18.1)
  })
})

describe('formatGrams', () => {
  it('always shows 0.1 g precision', () => {
    expect(formatGrams(18)).toBe('18.0')
    expect(formatGrams(36.04)).toBe('36.0')
    expect(formatGrams(36.96)).toBe('37.0')
  })
})

describe('formatRatio', () => {
  it('formats as 1:x.x', () => {
    expect(formatRatio(2)).toBe('1:2.0')
    expect(formatRatio(2.456)).toBe('1:2.5')
  })
})
