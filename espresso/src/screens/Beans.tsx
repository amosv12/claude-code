import { useState } from 'react'
import { Button, Chip, EmptyState, Screen, TextAreaField, TextField } from '../components/ui'
import { db } from '../db/db'
import type { Bean, NewBean, RoastLevel } from '../db/schema'
import { useLiveQuery } from '../db/useLiveQuery'

const ROAST_LEVELS: RoastLevel[] = ['light', 'medium', 'dark']

interface BeanDraft {
  name: string
  roaster: string
  origin: string
  process: string
  roastLevel: RoastLevel
  roastDate: string
  openedDate: string
  notes: string
}

const emptyDraft: BeanDraft = {
  name: '',
  roaster: '',
  origin: '',
  process: '',
  roastLevel: 'medium',
  roastDate: '',
  openedDate: '',
  notes: '',
}

function toDraft(b: Bean): BeanDraft {
  return {
    name: b.name,
    roaster: b.roaster,
    origin: b.origin ?? '',
    process: b.process ?? '',
    roastLevel: b.roastLevel,
    roastDate: b.roastDate,
    openedDate: b.openedDate ?? '',
    notes: b.notes ?? '',
  }
}

function toBean(d: BeanDraft): NewBean {
  const bean: NewBean = {
    name: d.name.trim(),
    roaster: d.roaster.trim(),
    roastLevel: d.roastLevel,
    roastDate: d.roastDate,
  }
  if (d.origin.trim()) bean.origin = d.origin.trim()
  if (d.process.trim()) bean.process = d.process.trim()
  if (d.openedDate) bean.openedDate = d.openedDate
  if (d.notes.trim()) bean.notes = d.notes.trim()
  return bean
}

function BeanForm({ initial, onSave, onCancel }: { initial: BeanDraft; onSave: (d: BeanDraft) => void; onCancel: () => void }) {
  const [d, setD] = useState(initial)
  const [submitted, setSubmitted] = useState(false)
  const set = <K extends keyof BeanDraft>(k: K) => (v: BeanDraft[K]) => setD((p) => ({ ...p, [k]: v }))
  const err = (v: string) => (submitted && !v.trim() ? 'Required' : undefined)

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-stone-800 bg-stone-900/50 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        setSubmitted(true)
        if (d.name.trim() && d.roaster.trim() && d.roastDate) onSave(d)
      }}
    >
      <TextField label="Name" value={d.name} onChange={set('name')} error={err(d.name)} required />
      <TextField label="Roaster" value={d.roaster} onChange={set('roaster')} error={err(d.roaster)} required />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-stone-300">Roast level</span>
        <div className="flex gap-2">
          {ROAST_LEVELS.map((r) => (
            <Chip key={r} selected={d.roastLevel === r} onClick={() => set('roastLevel')(r)}>
              {r}
            </Chip>
          ))}
        </div>
      </div>
      <TextField label="Roast date" type="date" value={d.roastDate} onChange={set('roastDate')} error={err(d.roastDate)} required />
      <TextField label="Origin" value={d.origin} onChange={set('origin')} placeholder="e.g. Ethiopia, Guji" />
      <TextField label="Process" value={d.process} onChange={set('process')} placeholder="e.g. Washed" />
      <TextField label="Opened date" type="date" value={d.openedDate} onChange={set('openedDate')} />
      <TextAreaField label="Notes" value={d.notes} onChange={set('notes')} />
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          Save bean
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export default function Beans() {
  const beans = useLiveQuery(() => db.beans.orderBy('roastDate').reverse().toArray())
  // null = closed, 'new' = adding, number = editing that id
  const [editing, setEditing] = useState<'new' | number | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (beans === undefined) return null

  const save = async (id: 'new' | number, d: BeanDraft) => {
    if (id === 'new') await db.beans.add(toBean(d))
    else await db.beans.put({ ...toBean(d), id })
    setEditing(null)
    setMessage(null)
  }

  const remove = async (b: Bean) => {
    const used = await db.shots.where('beanId').equals(b.id).count()
    if (used > 0) {
      setMessage(`“${b.name}” is used by ${used} logged shot${used === 1 ? '' : 's'}, so it can't be deleted.`)
      return
    }
    if (window.confirm(`Delete “${b.name}”?`)) {
      await db.beans.delete(b.id)
      setMessage(null)
    }
  }

  return (
    <Screen
      title="Beans"
      actions={
        beans.length > 0 && editing === null ? <Button onClick={() => setEditing('new')}>Add bean</Button> : undefined
      }
    >
      {message && (
        <p role="alert" className="rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-200">
          {message}
        </p>
      )}
      {editing === 'new' && <BeanForm initial={emptyDraft} onSave={(d) => save('new', d)} onCancel={() => setEditing(null)} />}
      {beans.length === 0 && editing === null && (
        <EmptyState
          title="No beans yet"
          body="Add the coffee you're brewing so every shot can be tied to it."
          action={{ label: 'Add your first bean', onClick: () => setEditing('new') }}
        />
      )}
      <ul className="flex flex-col gap-3">
        {beans.map((b) =>
          editing === b.id ? (
            <li key={b.id}>
              <BeanForm initial={toDraft(b)} onSave={(d) => save(b.id, d)} onCancel={() => setEditing(null)} />
            </li>
          ) : (
            <li key={b.id} className="flex flex-col gap-2 rounded-xl border border-stone-800 bg-stone-900/50 p-4">
              <div>
                <p className="text-lg font-semibold">{b.name}</p>
                <p className="text-stone-400">
                  {b.roaster} · {b.roastLevel} · roasted {b.roastDate}
                </p>
                {(b.origin || b.process) && (
                  <p className="text-sm text-stone-400">{[b.origin, b.process].filter(Boolean).join(' · ')}</p>
                )}
                {b.openedDate && <p className="text-sm text-stone-500">Opened {b.openedDate}</p>}
                {b.notes && <p className="mt-1 text-sm text-stone-300">{b.notes}</p>}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setEditing(b.id)}>
                  Edit
                </Button>
                <Button variant="danger" onClick={() => remove(b)}>
                  Delete
                </Button>
              </div>
            </li>
          ),
        )}
      </ul>
    </Screen>
  )
}
