import { describe, expect, it } from 'vitest'
import { parseShotForm, previewShot, type ShotFormValues } from './shotForm'

const valid: ShotFormValues = {
  beanId: '3',
  grinderId: '',
  machineId: '',
  grindSetting: ' 14.5 ',
  doseG: '18,0',
  yieldG: '36.2',
  timeS: '28.4',
  tempC: '',
  pressureBar: '',
  preinfusionS: '',
  tdsPct: '',
  tasteTags: ['sweet'],
  rating: 4,
  notes: '  ',
}

describe('parseShotForm', () => {
  it('builds a shot: comma decimals, trimmed strings, absent optionals omitted', () => {
    const r = parseShotForm(valid, 1700000000000)
    expect(r).toEqual({
      ok: true,
      shot: {
        createdAt: 1700000000000,
        beanId: 3,
        grindSetting: '14.5',
        doseG: 18,
        yieldG: 36.2,
        timeS: 28.4,
        tasteTags: ['sweet'],
        rating: 4,
      },
    })
  })

  it('includes optional fields and ids when given, rounding grams to 0.1', () => {
    const r = parseShotForm(
      { ...valid, grinderId: '2', machineId: '5', doseG: '18.04', tempC: '93,5', pressureBar: '9', preinfusionS: '5', tdsPct: '9.126', notes: ' hi ' },
      1,
    )
    expect(r.ok && r.shot).toMatchObject({
      grinderId: 2,
      machineId: 5,
      doseG: 18,
      tempC: 93.5,
      pressureBar: 9,
      preinfusionS: 5,
      tdsPct: 9.13,
      notes: 'hi',
    })
  })

  it('reports every missing required field', () => {
    const r = parseShotForm({ ...valid, beanId: '', doseG: '', yieldG: '', timeS: '', rating: 0 }, 1)
    expect(r).toEqual({
      ok: false,
      errors: { beanId: 'Choose a bean', doseG: 'Required', yieldG: 'Required', timeS: 'Required', rating: 'Pick a rating' },
    })
  })

  it('rejects malformed and out-of-range numbers', () => {
    const r = parseShotForm({ ...valid, doseG: 'abc', yieldG: '0.04', tempC: '500', tdsPct: '1.2.3' }, 1)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.doseG).toBe('Enter a number')
      expect(r.errors.yieldG).toMatch(/at least/)
      expect(r.errors.tempC).toMatch(/at most/)
      expect(r.errors.tdsPct).toBe('Enter a number')
    }
  })

  it('treats a dose that rounds to zero as invalid', () => {
    const r = parseShotForm({ ...valid, doseG: '0.04' }, 1)
    expect(r.ok).toBe(false)
  })
})

describe('previewShot', () => {
  it('is null until dose, yield and time are valid', () => {
    expect(previewShot({ ...valid, yieldG: '' })).toBeNull()
    expect(previewShot({ ...valid, doseG: '0' })).toBeNull()
  })

  it('returns ratio and flags; EY only with TDS', () => {
    const p = previewShot({ ...valid, doseG: '18', yieldG: '36', timeS: '20' })
    expect(p?.ratio).toBe(2)
    expect(p?.flags).toEqual({ ratio: 'ok', time: 'low' })
    expect(p?.ey).toBeUndefined()
    const q = previewShot({ ...valid, doseG: '18', yieldG: '36', timeS: '28', tdsPct: '9' })
    expect(q?.ey).toBeCloseTo(18, 10)
    expect(q?.flags.ey).toBe('ok')
  })
})
