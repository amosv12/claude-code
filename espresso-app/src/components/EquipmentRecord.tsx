import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { useStore } from '../store';
import type { Equipment, Grinder, Machine } from '../types';

interface MachineForm {
  name: string;
  maxPressureBar: string;
  basketSizeG: string;
}

interface GrinderForm {
  name: string;
  burrSizeMm: string;
}

function machineToForm(m: Machine | null): MachineForm {
  return {
    name: m?.name ?? '',
    maxPressureBar: m ? String(m.maxPressureBar) : '9',
    basketSizeG: m ? String(m.basketSizeG) : '18',
  };
}

function grinderToForm(g: Grinder | null): GrinderForm {
  return {
    name: g?.name ?? '',
    burrSizeMm: g ? String(g.burrSizeMm) : '58',
  };
}

function parseNumber(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function EquipmentRecord(): ReactElement {
  const equipment = useStore((s) => s.equipment);
  const setEquipment = useStore((s) => s.setEquipment);

  const [machineForm, setMachineForm] = useState<MachineForm>(() => machineToForm(equipment.machine));
  const [grinderForm, setGrinderForm] = useState<GrinderForm>(() => grinderToForm(equipment.grinder));
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setMachineForm(machineToForm(equipment.machine));
    setGrinderForm(grinderToForm(equipment.grinder));
  }, [equipment]);

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const machine: Machine | null = machineForm.name.trim()
      ? {
          name: machineForm.name.trim(),
          maxPressureBar: parseNumber(machineForm.maxPressureBar, 0),
          basketSizeG: parseNumber(machineForm.basketSizeG, 0),
        }
      : null;
    const grinder: Grinder | null = grinderForm.name.trim()
      ? {
          name: grinderForm.name.trim(),
          burrSizeMm: parseNumber(grinderForm.burrSizeMm, 0),
        }
      : null;
    const next: Equipment = { id: 'singleton', machine, grinder };
    void setEquipment(next).then(() => setSavedAt(Date.now()));
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Equipment</h2>
      <p className="text-sm text-slate-600">
        One machine and one grinder. Leave a name blank to clear that record.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Machine
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Name</span>
              <input
                type="text"
                value={machineForm.name}
                onChange={(e) => setMachineForm({ ...machineForm, name: e.target.value })}
                placeholder="e.g. Lelit Bianca"
                className="input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Max pressure (bar)</span>
              <input
                type="number"
                step="0.1"
                value={machineForm.maxPressureBar}
                onChange={(e) =>
                  setMachineForm({ ...machineForm, maxPressureBar: e.target.value })
                }
                className="input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Basket size (g)</span>
              <input
                type="number"
                step="0.1"
                value={machineForm.basketSizeG}
                onChange={(e) => setMachineForm({ ...machineForm, basketSizeG: e.target.value })}
                className="input"
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Grinder
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Name</span>
              <input
                type="text"
                value={grinderForm.name}
                onChange={(e) => setGrinderForm({ ...grinderForm, name: e.target.value })}
                placeholder="e.g. Niche Zero"
                className="input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Burr size (mm)</span>
              <input
                type="number"
                step="0.1"
                value={grinderForm.burrSizeMm}
                onChange={(e) => setGrinderForm({ ...grinderForm, burrSizeMm: e.target.value })}
                className="input"
              />
            </label>
          </div>
        </fieldset>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Save equipment
          </button>
          {savedAt && (
            <span className="text-xs text-slate-500">
              Saved at {new Date(savedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
