import type { NewShot, TasteTag } from '../db/schema'
import { classifyShot, extractionYield, ratio, type ShotFlags } from './brew'
import { parseDecimal, roundTo } from './numeric'

/** Raw form state: everything the user types stays a string until validated. */
export interface ShotFormValues {
  beanId: string
  grinderId: string
  machineId: string
  grindSetting: string
  doseG: string
  yieldG: string
  timeS: string
  tempC: string
  pressureBar: string
  preinfusionS: string
  tdsPct: string
  tasteTags: TasteTag[]
  /** 0 = not chosen yet */
  rating: number
  notes: string
}

export type ShotFormField = Exclude<keyof ShotFormValues, 'tasteTags'>
export type ShotFormErrors = Partial<Record<ShotFormField, string>>

export type ShotFormResult = { ok: true; shot: NewShot } | { ok: false; errors: ShotFormErrors }

interface NumberRule {
  decimals: number
  min?: number
  max?: number
}

/** Parses, range-checks and rounds one numeric field. '' → undefined (absent). */
function num(raw: string, rule: NumberRule): { value?: number; error?: string } {
  if (raw.trim() === '') return {}
  const parsed = parseDecimal(raw)
  if (parsed === null) return { error: 'Enter a number' }
  const value = roundTo(parsed, rule.decimals)
  if (rule.min !== undefined && value < rule.min) return { error: `Must be at least ${rule.min}` }
  if (rule.max !== undefined && value > rule.max) return { error: `Must be at most ${rule.max}` }
  return { value }
}

export function parseShotForm(v: ShotFormValues, createdAt: number): ShotFormResult {
  const errors: ShotFormErrors = {}

  const beanId = Number(v.beanId)
  if (v.beanId === '' || !Number.isInteger(beanId)) errors.beanId = 'Choose a bean'

  const required = (field: ShotFormField, raw: string, rule: NumberRule): number => {
    if (raw.trim() === '') {
      errors[field] = 'Required'
      return 0
    }
    const r = num(raw, rule)
    if (r.error) errors[field] = r.error
    return r.value ?? 0
  }
  const optional = (field: ShotFormField, raw: string, rule: NumberRule): number | undefined => {
    const r = num(raw, rule)
    if (r.error) errors[field] = r.error
    return r.value
  }

  const doseG = required('doseG', v.doseG, { decimals: 1, min: 0.1, max: 100 })
  const yieldG = required('yieldG', v.yieldG, { decimals: 1, min: 0.1, max: 500 })
  const timeS = required('timeS', v.timeS, { decimals: 1, min: 0.1, max: 600 })
  const tempC = optional('tempC', v.tempC, { decimals: 1, min: 1, max: 120 })
  const pressureBar = optional('pressureBar', v.pressureBar, { decimals: 1, min: 0.1, max: 20 })
  const preinfusionS = optional('preinfusionS', v.preinfusionS, { decimals: 1, min: 0, max: 120 })
  const tdsPct = optional('tdsPct', v.tdsPct, { decimals: 2, min: 0.1, max: 30 })

  if (!Number.isInteger(v.rating) || v.rating < 1 || v.rating > 5) errors.rating = 'Pick a rating'

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  const shot: NewShot = {
    createdAt,
    beanId,
    grindSetting: v.grindSetting.trim(),
    doseG,
    yieldG,
    timeS,
    tasteTags: v.tasteTags,
    rating: v.rating,
  }
  if (v.grinderId !== '') shot.grinderId = Number(v.grinderId)
  if (v.machineId !== '') shot.machineId = Number(v.machineId)
  if (tempC !== undefined) shot.tempC = tempC
  if (pressureBar !== undefined) shot.pressureBar = pressureBar
  if (preinfusionS !== undefined) shot.preinfusionS = preinfusionS
  if (tdsPct !== undefined) shot.tdsPct = tdsPct
  const notes = v.notes.trim()
  if (notes !== '') shot.notes = notes
  return { ok: true, shot }
}

export interface ShotPreview {
  ratio: number
  ey?: number
  flags: ShotFlags
}

/** Live feedback while typing; null until dose, yield and time are all valid. */
export function previewShot(v: ShotFormValues): ShotPreview | null {
  const doseG = parseDecimal(v.doseG)
  const yieldG = parseDecimal(v.yieldG)
  const timeS = parseDecimal(v.timeS)
  if (!doseG || !yieldG || !timeS) return null
  const tempC = parseDecimal(v.tempC) ?? undefined
  const tdsPct = parseDecimal(v.tdsPct) ?? undefined
  const preview: ShotPreview = {
    ratio: ratio(doseG, yieldG),
    flags: classifyShot({ doseG, yieldG, timeS, tempC, tdsPct }),
  }
  const ey = extractionYield(doseG, yieldG, tdsPct)
  if (ey !== undefined) preview.ey = ey
  return preview
}
