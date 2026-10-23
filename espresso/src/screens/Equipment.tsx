import { useState } from 'react'
import { Button, Chip, EmptyState, Screen, TextAreaField, TextField } from '../components/ui'
import { db } from '../db/db'
import type { Equipment, EquipmentType, NewEquipment } from '../db/schema'
import { useLiveQuery } from '../db/useLiveQuery'

const TYPES: { type: EquipmentType; label: string; plural: string }[] = [
  { type: 'machine', label: 'Machine', plural: 'Machines' },
  { type: 'grinder', label: 'Grinder', plural: 'Grinders' },
  { type: 'basket', label: 'Basket', plural: 'Baskets' },
]

interface Draft {
  type: EquipmentType
  name: string
  scaleDescription: string
  notes: string
}

function toDraft(e: Equipment): Draft {
  return {
    type: e.type,
    name: e.name,
    scaleDescription: e.type === 'grinder' ? e.scaleDescription : '',
    notes: e.notes ?? '',
  }
}

function toEquipment(d: Draft): NewEquipment {
  const notes = d.notes.trim() || undefined
  const base = { name: d.name.trim(), ...(notes ? { notes } : {}) }
  return d.type === 'grinder'
    ? { ...base, type: 'grinder', scaleDescription: d.scaleDescription.trim() }
    : { ...base, type: d.type }
}

function EquipmentForm({ initial, onSave, onCancel }: { initial: Draft; onSave: (d: Draft) => void; onCancel: () => void }) {
  const [d, setD] = useState(initial)
  const [submitted, setSubmitted] = useState(false)
  const set = <K extends keyof Draft>(k: K) => (v: Draft[K]) => setD((p) => ({ ...p, [k]: v }))
  const isGrinder = d.type === 'grinder'
  const err = (v: string) => (submitted && !v.trim() ? 'Required' : undefined)

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-stone-800 bg-stone-900/50 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        setSubmitted(true)
        if (d.name.trim() && (!isGrinder || d.scaleDescription.trim())) onSave(d)
      }}
    >
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-stone-300">Type</span>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <Chip key={t.type} selected={d.type === t.type} onClick={() => set('type')(t.type)}>
              {t.label}
            </Chip>
          ))}
        </div>
      </div>
      <TextField label="Name" value={d.name} onChange={set('name')} error={err(d.name)} required />
      {isGrinder && (
        <TextField
          label="Scale"
          value={d.scaleDescription}
          onChange={set('scaleDescription')}
          placeholder="e.g. 0–40 stepless"
          error={err(d.scaleDescription)}
          required
        />
      )}
      <TextAreaField label="Notes" value={d.notes} onChange={set('notes')} />
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          Save
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export default function EquipmentScreen() {
  const items = useLiveQuery(() => db.equipment.toArray())
  const [editing, setEditing] = useState<'new' | number | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (items === undefined) return null

  const save = async (id: 'new' | number, d: Draft) => {
    if (id === 'new') await db.equipment.add(toEquipment(d))
    else await db.equipment.put({ ...toEquipment(d), id })
    setEditing(null)
    setMessage(null)
  }

  const remove = async (e: Equipment) => {
    const used = await db.shots.filter((s) => s.grinderId === e.id || s.machineId === e.id).count()
    if (used > 0) {
      setMessage(`“${e.name}” is used by ${used} logged shot${used === 1 ? '' : 's'}, so it can't be deleted.`)
      return
    }
    if (window.confirm(`Delete “${e.name}”?`)) {
      await db.equipment.delete(e.id)
      setMessage(null)
    }
  }

  return (
    <Screen
      title="Equipment"
      actions={items.length > 0 && editing === null ? <Button onClick={() => setEditing('new')}>Add</Button> : undefined}
    >
      {message && (
        <p role="alert" className="rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-200">
          {message}
        </p>
      )}
      {editing === 'new' && (
        <EquipmentForm
          initial={{ type: 'grinder', name: '', scaleDescription: '', notes: '' }}
          onSave={(d) => save('new', d)}
          onCancel={() => setEditing(null)}
        />
      )}
      {items.length === 0 && editing === null && (
        <EmptyState
          title="No equipment yet"
          body="Add your grinder and machine to compare grind settings between shots."
          action={{ label: 'Add your first grinder', onClick: () => setEditing('new') }}
        />
      )}
      {TYPES.map(({ type, plural }) => {
        const group = items.filter((i) => i.type === type)
        if (group.length === 0) return null
        return (
          <div key={type} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">{plural}</h2>
            <ul className="flex flex-col gap-3">
              {group.map((e) =>
                editing === e.id ? (
                  <li key={e.id}>
                    <EquipmentForm initial={toDraft(e)} onSave={(d) => save(e.id, d)} onCancel={() => setEditing(null)} />
                  </li>
                ) : (
                  <li key={e.id} className="flex flex-col gap-2 rounded-xl border border-stone-800 bg-stone-900/50 p-4">
                    <div>
                      <p className="text-lg font-semibold">{e.name}</p>
                      {e.type === 'grinder' && <p className="text-stone-400">Scale: {e.scaleDescription}</p>}
                      {e.notes && <p className="mt-1 text-sm text-stone-300">{e.notes}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setEditing(e.id)}>
                        Edit
                      </Button>
                      <Button variant="danger" onClick={() => remove(e)}>
                        Delete
                      </Button>
                    </div>
                  </li>
                ),
              )}
            </ul>
          </div>
        )
      })}
    </Screen>
  )
}
