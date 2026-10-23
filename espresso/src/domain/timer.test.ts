import { describe, expect, it } from 'vitest'
import { elapsedMs, formatElapsed, parseStoredStart, toSeconds } from './timer'

describe('elapsedMs', () => {
  it('is the wall-clock delta, however long the gap (screen lock)', () => {
    expect(elapsedMs(1_000, 29_400)).toBe(28_400)
    expect(elapsedMs(0, 10 * 60_000)).toBe(600_000)
  })

  it('never goes negative if the clock steps backwards', () => {
    expect(elapsedMs(5_000, 4_000)).toBe(0)
  })
})

describe('toSeconds', () => {
  it('rounds to 0.1 s', () => {
    expect(toSeconds(28_449)).toBe(28.4)
    expect(toSeconds(28_450)).toBe(28.5)
    expect(toSeconds(0)).toBe(0)
  })
})

describe('formatElapsed', () => {
  it('shows seconds with one decimal, truncating (a running clock never runs ahead)', () => {
    expect(formatElapsed(0)).toBe('0.0')
    expect(formatElapsed(28_499)).toBe('28.4')
    expect(formatElapsed(59_999)).toBe('59.9')
  })

  it('switches to m:ss.t past a minute', () => {
    expect(formatElapsed(65_200)).toBe('1:05.2')
  })

  it('clamps negatives', () => {
    expect(formatElapsed(-50)).toBe('0.0')
  })
})

describe('parseStoredStart', () => {
  const now = 1_000_000
  it('restores a recent start', () => {
    expect(parseStoredStart(String(now - 20_000), now)).toBe(now - 20_000)
  })
  it('rejects missing, malformed, future and stale values', () => {
    expect(parseStoredStart(null, now)).toBeNull()
    expect(parseStoredStart('abc', now)).toBeNull()
    expect(parseStoredStart('0', now)).toBeNull()
    expect(parseStoredStart(String(now + 1), now)).toBeNull()
    expect(parseStoredStart(String(now - 11 * 60_000), now)).toBeNull()
  })
})
