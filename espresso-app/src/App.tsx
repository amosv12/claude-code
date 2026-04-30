import { useEffect, useState, type ReactElement } from 'react';
import { useStore } from './store';
import { ShotLogger } from './components/ShotLogger';
import { ProfileLibrary } from './components/ProfileLibrary';
import { ShotComparison } from './components/ShotComparison';
import { EquipmentRecord } from './components/EquipmentRecord';
import type { TabId } from './types';

const TABS: { id: TabId; label: string }[] = [
  { id: 'log', label: 'Log' },
  { id: 'profiles', label: 'Profiles' },
  { id: 'compare', label: 'Compare' },
  { id: 'equipment', label: 'Equipment' },
];

export function App(): ReactElement {
  const initialized = useStore((s) => s.initialized);
  const init = useStore((s) => s.init);
  const [tab, setTab] = useState<TabId>('log');

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-base font-semibold text-slate-900">Espresso Shot Profiler</h1>
            <p className="text-xs text-slate-500">Local-only logbook & profile editor</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 px-4 py-4 sm:px-6">
        {!initialized ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : tab === 'log' ? (
          <ShotLogger />
        ) : tab === 'profiles' ? (
          <ProfileLibrary />
        ) : tab === 'compare' ? (
          <ShotComparison />
        ) : (
          <EquipmentRecord />
        )}
      </main>

      <footer className="px-4 py-6 text-center text-xs text-slate-400">
        All data lives in your browser. Nothing is uploaded.
      </footer>
    </div>
  );
}
