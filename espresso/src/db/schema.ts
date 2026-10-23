/** Units: grams, seconds, °C, bar, ppm as CaCO3. Derived values (ratio, daysOffRoast, EY) are never stored. */

export type RoastLevel = 'light' | 'medium' | 'dark'

export interface Bean {
  id: number
  name: string
  roaster: string
  origin?: string
  process?: string
  roastLevel: RoastLevel
  /** Calendar date, YYYY-MM-DD */
  roastDate: string
  /** Calendar date, YYYY-MM-DD */
  openedDate?: string
  notes?: string
}

interface EquipmentBase {
  id: number
  name: string
  notes?: string
}

export interface Machine extends EquipmentBase {
  type: 'machine'
}

export interface Basket extends EquipmentBase {
  type: 'basket'
}

export interface Grinder extends EquipmentBase {
  type: 'grinder'
  /** e.g. "0–40 stepless" */
  scaleDescription: string
}

export type Equipment = Machine | Basket | Grinder
export type EquipmentType = Equipment['type']

export const TASTE_TAGS = [
  'sour',
  'bitter',
  'salty',
  'astringent',
  'sweet',
  'balanced',
  'thin',
  'syrupy',
] as const
export type TasteTag = (typeof TASTE_TAGS)[number]

export interface Shot {
  id: number
  /** Epoch ms */
  createdAt: number
  beanId: number
  grinderId?: number
  machineId?: number
  /** String, since grinders vary (e.g. "14.5", "3 + 2 clicks") */
  grindSetting: string
  doseG: number
  yieldG: number
  timeS: number
  tempC?: number
  pressureBar?: number
  preinfusionS?: number
  tdsPct?: number
  tasteTags: TasteTag[]
  /** 1–5 */
  rating: number
  notes?: string
}

/** Insert types: the id is assigned by IndexedDB unless an existing one is passed (put = edit). */
type WithOptionalId<T extends { id: number }> = T extends unknown ? Omit<T, 'id'> & { id?: number } : never
export type NewBean = WithOptionalId<Bean>
export type NewEquipment = WithOptionalId<Equipment>
export type NewShot = WithOptionalId<Shot>
