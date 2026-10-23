import Dexie, { type Table } from 'dexie'
import type { Bean, Equipment, NewBean, NewEquipment, NewShot, Shot } from './schema'

class EspressoDB extends Dexie {
  beans!: Table<Bean, number, NewBean>
  equipment!: Table<Equipment, number, NewEquipment>
  shots!: Table<Shot, number, NewShot>

  constructor() {
    super('espresso-dial-in')
    this.version(1).stores({
      beans: '++id, name, roastDate',
      equipment: '++id, type',
      shots: '++id, createdAt, beanId',
    })
  }
}

export const db = new EspressoDB()
