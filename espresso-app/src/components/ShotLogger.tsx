import { useMemo, useState, type FormEvent, type ReactElement } from 'react';
import { useStore, newId } from '../store';
import type { Bean, RoastLevel, Shot } from '../types';

const ROAST_LEVELS: RoastLevel[] = ['light', 'medium-light', 'medium', 'medium-dark', 'dark'];

interface FormState {
  beanName: string;
  roaster: string;
  roastDate: string;
  roastLevel: RoastLevel;
  grinderSetting: string;
  doseG: string;
  yieldG: string;
  timeS: string;
  tempC: string;
  rating: number;
  notes: string;
  profileId: string;
}

function emptyForm(): FormState {
  return {
    beanName: '',
    roaster: '',
    roastDate: '',
    roastLevel: 'medium',
    grinderSetting: '',
    doseG: '18',
    yieldG: '36',
    timeS: '28',
    tempC: '93',
    rating: 3,
    notes: '',
    profileId: '',
  };
}

function shotToForm(shot: Shot): FormState {
  return {
    beanName: shot.bean.name,
    roaster: shot.bean.roaster,
    roastDate: shot.bean.roastDate,
    roastLevel: shot.bean.roastLevel,
    grinderSetting: shot.grinderSetting,
    doseG: String(shot.doseG),
    yieldG: String(shot.yieldG),
    timeS: String(shot.timeS),
    tempC: String(shot.tempC),
    rating: shot.rating,
    notes: shot.notes,
    profileId: shot.profileId ?? '',
  };
}

function parseNumber(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function StarInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}): ReactElement {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          onClick={() => onChange(n)}
          className={`text-2xl leading-none transition ${
            n <= value ? 'text-amber-500' : 'text-slate-300'
          }`}
        >
          {'★'}
        </button>
      ))}
      <span className="ml-2 text-sm text-slate-500">{value}/5</span>
    </div>
  );
}

export function ShotLogger(): ReactElement {
  const shots = useStore((s) => s.shots);
  const profiles = useStore((s) => s.profiles);
  const upsertShot = useStore((s) => s.upsertShot);
  const removeShot = useStore((s) => s.removeShot);

  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const sortedShots = useMemo(() => shots, [shots]);

  function resetForm(): void {
    setForm(emptyForm());
    setEditingId(null);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const bean: Bean = {
      name: form.beanName.trim(),
      roaster: form.roaster.trim(),
      roastDate: form.roastDate,
      roastLevel: form.roastLevel,
    };
    const shot: Shot = {
      id: editingId ?? newId('shot'),
      createdAt: editingId
        ? (shots.find((s) => s.id === editingId)?.createdAt ?? Date.now())
        : Date.now(),
      bean,
      grinderSetting: form.grinderSetting.trim(),
      doseG: parseNumber(form.doseG, 0),
      yieldG: parseNumber(form.yieldG, 0),
      timeS: parseNumber(form.timeS, 0),
      tempC: parseNumber(form.tempC, 0),
      rating: form.rating,
      notes: form.notes.trim(),
      profileId: form.profileId === '' ? null : form.profileId,
    };
    void upsertShot(shot).then(() => {
      resetForm();
      setShowForm(false);
    });
  }

  function startEdit(shot: Shot): void {
    setForm(shotToForm(shot));
    setEditingId(shot.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startNew(): void {
    resetForm();
    setShowForm(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Shot log</h2>
        {!showForm && (
          <button
            type="button"
            onClick={startNew}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            + Log shot
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4"
        >
          <h3 className="text-sm font-semibold text-slate-700">
            {editingId ? 'Edit shot' : 'New shot'}
          </h3>

          <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <legend className="col-span-full text-xs font-semibold uppercase tracking-wide text-slate-500">
              Bean
            </legend>
            <Field label="Name">
              <input
                type="text"
                value={form.beanName}
                onChange={(e) => setForm({ ...form, beanName: e.target.value })}
                required
                className="input"
              />
            </Field>
            <Field label="Roaster">
              <input
                type="text"
                value={form.roaster}
                onChange={(e) => setForm({ ...form, roaster: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Roast date">
              <input
                type="date"
                value={form.roastDate}
                onChange={(e) => setForm({ ...form, roastDate: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Roast level">
              <select
                value={form.roastLevel}
                onChange={(e) => setForm({ ...form, roastLevel: e.target.value as RoastLevel })}
                className="input"
              >
                {ROAST_LEVELS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
          </fieldset>

          <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <legend className="col-span-full text-xs font-semibold uppercase tracking-wide text-slate-500">
              Brew
            </legend>
            <Field label="Grinder setting">
              <input
                type="text"
                value={form.grinderSetting}
                onChange={(e) => setForm({ ...form, grinderSetting: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Dose (g)">
              <input
                type="number"
                step="0.1"
                value={form.doseG}
                onChange={(e) => setForm({ ...form, doseG: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Yield (g)">
              <input
                type="number"
                step="0.1"
                value={form.yieldG}
                onChange={(e) => setForm({ ...form, yieldG: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Time (s)">
              <input
                type="number"
                step="0.1"
                value={form.timeS}
                onChange={(e) => setForm({ ...form, timeS: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Brew temp (°C)">
              <input
                type="number"
                step="0.1"
                value={form.tempC}
                onChange={(e) => setForm({ ...form, tempC: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Profile">
              <select
                value={form.profileId}
                onChange={(e) => setForm({ ...form, profileId: e.target.value })}
                className="input"
              >
                <option value="">(none)</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
          </fieldset>

          <Field label="Rating">
            <StarInput value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
          </Field>

          <Field label="Tasting notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="input resize-y"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              {editingId ? 'Save changes' : 'Save shot'}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {sortedShots.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No shots logged yet. Pull a shot and log it above.
          </p>
        ) : (
          sortedShots.map((shot) => {
            const profile = profiles.find((p) => p.id === shot.profileId);
            const ratio = shot.doseG > 0 ? (shot.yieldG / shot.doseG).toFixed(2) : '—';
            return (
              <div
                key={shot.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {shot.bean.name || '(unnamed bean)'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {shot.bean.roaster ? `${shot.bean.roaster} · ` : ''}
                      {shot.bean.roastLevel}
                      {shot.bean.roastDate ? ` · roasted ${shot.bean.roastDate}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500" aria-label={`${shot.rating} of 5 stars`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} className={i < shot.rating ? '' : 'text-slate-300'}>
                        {'★'}
                      </span>
                    ))}
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                  <Stat label="Dose" value={`${shot.doseG} g`} />
                  <Stat label="Yield" value={`${shot.yieldG} g`} />
                  <Stat label="Ratio" value={`1:${ratio}`} />
                  <Stat label="Time" value={`${shot.timeS} s`} />
                  <Stat label="Temp" value={`${shot.tempC} °C`} />
                  <Stat label="Grinder" value={shot.grinderSetting || '—'} />
                  <Stat label="Profile" value={profile?.name ?? '—'} />
                  <Stat
                    label="Logged"
                    value={new Date(shot.createdAt).toLocaleDateString()}
                  />
                </dl>
                {shot.notes && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{shot.notes}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(shot)}
                    className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete this shot?')) {
                        void removeShot(shot.id);
                      }
                    }}
                    className="rounded border border-red-200 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactElement }): ReactElement {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
