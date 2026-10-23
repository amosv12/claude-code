import { useMemo, useState } from 'react'
import { Button, Chip, NumberField, SelectField, TextAreaField, TextField } from './ui'
import { outOfTarget } from '../domain/brew'
import { formatGrams, formatRatio } from '../domain/numeric'
import { parseShotForm, previewShot, type ShotFormErrors, type ShotFormValues } from '../domain/shotForm'
import { TASTE_TAGS, type Bean, type Equipment, type NewShot, type Shot, type TasteTag } from '../db/schema'

interface ShotFormProps {
  beans: Bean[]
  equipment: Equipment[]
  /** The most recent shot; bean, grinder, dose and grind setting are carried over from it. */
  previous: Shot | null
  timeS: number
  createdAt: number
  onSave: (shot: NewShot) => void
  onDiscard: () => void
}

function initialValues(beans: Bean[], previous: Shot | null, timeS: number): ShotFormValues {
  const beanId =
    previous && beans.some((b) => b.id === previous.beanId) ? previous.beanId : beans.length === 1 ? beans[0]!.id : undefined
  return {
    beanId: beanId !== undefined ? String(beanId) : '',
    grinderId: previous?.grinderId !== undefined ? String(previous.grinderId) : '',
    machineId: '',
    grindSetting: previous?.grindSetting ?? '',
    doseG: previous ? formatGrams(previous.doseG) : '',
    yieldG: '',
    timeS: timeS.toFixed(1),
    tempC: '',
    pressureBar: '',
    preinfusionS: '',
    tdsPct: '',
    tasteTags: [],
    rating: 0,
    notes: '',
  }
}

export function ShotForm({ beans, equipment, previous, timeS, createdAt, onSave, onDiscard }: ShotFormProps) {
  const [v, setV] = useState(() => initialValues(beans, previous, timeS))
  const [errors, setErrors] = useState<ShotFormErrors>({})
  const set = <K extends keyof ShotFormValues>(k: K) => (value: ShotFormValues[K]) => {
    setV((p) => ({ ...p, [k]: value }))
    setErrors((p) => ({ ...p, [k]: undefined }))
  }

  const grinders = equipment.filter((e) => e.type === 'grinder')
  const machines = equipment.filter((e) => e.type === 'machine')
  const preview = useMemo(() => previewShot(v), [v])
  const misses = preview ? outOfTarget(preview.flags) : []

  const toggleTag = (t: TasteTag) =>
    set('tasteTags')(v.tasteTags.includes(t) ? v.tasteTags.filter((x) => x !== t) : [...v.tasteTags, t])

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        const result = parseShotForm(v, createdAt)
        if (result.ok) onSave(result.shot)
        else setErrors(result.errors)
      }}
    >
      <div
        className="rounded-xl border border-stone-800 bg-stone-900/50 p-3 text-stone-300"
        aria-live="polite"
      >
        {preview ? (
          <>
            <p className="text-lg font-semibold text-stone-100">
              {formatRatio(preview.ratio)} · {v.timeS} s{preview.ey !== undefined && ` · EY ${preview.ey.toFixed(1)}%`}
            </p>
            <p className="text-sm">
              {misses.length === 0
                ? 'All metrics in target'
                : misses.map((m) => `${m.metric === 'ey' ? 'EY' : m.metric} ${m.flag}`).join(' · ')}
            </p>
          </>
        ) : (
          <p className="text-sm">Enter dose and yield to see the ratio.</p>
        )}
      </div>

      <SelectField
        label="Bean"
        value={v.beanId}
        onChange={set('beanId')}
        options={beans.map((b) => ({ value: String(b.id), label: `${b.name} — ${b.roaster}` }))}
        placeholder="Choose a bean…"
        error={errors.beanId}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Dose" unit="g" decimals={1} value={v.doseG} onChange={set('doseG')} error={errors.doseG} required />
        <NumberField label="Yield" unit="g" decimals={1} value={v.yieldG} onChange={set('yieldG')} error={errors.yieldG} required />
      </div>
      <NumberField label="Time" unit="s" decimals={1} value={v.timeS} onChange={set('timeS')} error={errors.timeS} required />
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Grinder"
          value={v.grinderId}
          onChange={set('grinderId')}
          options={grinders.map((g) => ({ value: String(g.id), label: g.name }))}
          placeholder="None"
        />
        <TextField label="Grind setting" value={v.grindSetting} onChange={set('grindSetting')} />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-stone-300">Taste</span>
        <div className="flex flex-wrap gap-2">
          {TASTE_TAGS.map((t) => (
            <Chip key={t} selected={v.tasteTags.includes(t)} onClick={() => toggleTag(t)}>
              {t}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-stone-300">
          Rating<span className="text-amber-500"> *</span>
        </span>
        <div className="grid grid-cols-5 gap-2" role="group" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={v.rating === n}
              onClick={() => set('rating')(n)}
              className={`min-h-12 rounded-lg border text-lg font-semibold ${
                v.rating === n ? 'border-amber-500 bg-amber-500 text-stone-950' : 'border-stone-600 text-stone-200'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {errors.rating && (
          <p role="alert" className="text-xs text-red-400">
            {errors.rating}
          </p>
        )}
      </div>

      <details className="rounded-xl border border-stone-800">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-stone-300">More details</summary>
        <div className="flex flex-col gap-4 border-t border-stone-800 p-4">
          <SelectField
            label="Machine"
            value={v.machineId}
            onChange={set('machineId')}
            options={machines.map((m) => ({ value: String(m.id), label: m.name }))}
            placeholder="None"
          />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Temp" unit="°C" value={v.tempC} onChange={set('tempC')} error={errors.tempC} />
            <NumberField label="Pressure" unit="bar" value={v.pressureBar} onChange={set('pressureBar')} error={errors.pressureBar} />
            <NumberField label="Pre-infusion" unit="s" value={v.preinfusionS} onChange={set('preinfusionS')} error={errors.preinfusionS} />
            <NumberField label="TDS" unit="%" value={v.tdsPct} onChange={set('tdsPct')} error={errors.tdsPct} />
          </div>
          <TextAreaField label="Notes" value={v.notes} onChange={set('notes')} />
        </div>
      </details>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          Save shot
        </Button>
        <Button variant="secondary" onClick={onDiscard}>
          Discard
        </Button>
      </div>
    </form>
  )
}
