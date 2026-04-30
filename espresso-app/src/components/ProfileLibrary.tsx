import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useStore } from '../store';
import type { Profile } from '../types';
import { ProfileEditor } from './ProfileEditor';

export function ProfileLibrary(): ReactElement {
  const profiles = useStore((s) => s.profiles);
  const upsertProfile = useStore((s) => s.upsertProfile);
  const removeProfile = useStore((s) => s.removeProfile);
  const duplicateProfile = useStore((s) => s.duplicateProfile);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');

  useEffect(() => {
    if (selectedId === null && profiles.length > 0) {
      setSelectedId(profiles[0]!.id);
    } else if (selectedId !== null && !profiles.some((p) => p.id === selectedId)) {
      setSelectedId(profiles[0]?.id ?? null);
    }
  }, [profiles, selectedId]);

  const selected = useMemo(
    () => profiles.find((p) => p.id === selectedId) ?? null,
    [profiles, selectedId],
  );

  function handleProfileChange(next: Profile): void {
    if (next.isBuiltIn) return;
    void upsertProfile(next);
  }

  async function handleDuplicate(profile: Profile): Promise<void> {
    const copy = await duplicateProfile(profile.id);
    if (copy) setSelectedId(copy.id);
  }

  function startRename(profile: Profile): void {
    if (profile.isBuiltIn) return;
    setRenaming(true);
    setDraftName(profile.name);
  }

  function commitRename(): void {
    if (!selected || selected.isBuiltIn) {
      setRenaming(false);
      return;
    }
    const trimmed = draftName.trim();
    if (trimmed.length > 0 && trimmed !== selected.name) {
      void upsertProfile({ ...selected, name: trimmed });
    }
    setRenaming(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Profile library</h2>

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[260px_1fr] lg:gap-6">
        <aside className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2">
          <ul className="flex flex-col gap-1">
            {profiles.map((p) => {
              const isActive = p.id === selectedId;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(p.id);
                      setRenaming(false);
                    }}
                    className={`flex w-full flex-col rounded-md px-3 py-2 text-left text-sm transition ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span
                      className={`text-xs ${
                        isActive ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {p.isBuiltIn ? 'Built-in preset' : 'Custom'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="flex flex-col gap-3">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3">
                {renaming && !selected.isBuiltIn ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setRenaming(false);
                      }}
                      className="input max-w-xs"
                    />
                    <button
                      type="button"
                      onClick={commitRename}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenaming(false)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{selected.name}</h3>
                    <p className="text-xs text-slate-500">
                      {selected.isBuiltIn ? 'Built-in preset (read-only)' : 'Custom profile'}
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDuplicate(selected)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Duplicate
                  </button>
                  {!selected.isBuiltIn && !renaming && (
                    <button
                      type="button"
                      onClick={() => startRename(selected)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Rename
                    </button>
                  )}
                  {!selected.isBuiltIn && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete profile "${selected.name}"?`)) {
                          void removeProfile(selected.id);
                        }
                      }}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <ProfileEditor
                profile={selected}
                onChange={handleProfileChange}
                readOnly={selected.isBuiltIn}
              />
            </>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              No profile selected.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
