import { useMemo, useState, type ReactElement } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStore } from '../store';
import type { Profile, Shot, Waypoint } from '../types';

const T_MIN = 0;
const T_MAX = 45;
const P_MIN = 0;
const P_MAX = 12;
const F_MIN = 0;
const F_MAX = 10;

const SHOT_COLORS = ['#dc2626', '#2563eb', '#16a34a', '#a855f7'] as const;
const MAX_SELECTION = 4;

interface CombinedSample {
  tS: number;
  [key: string]: number;
}

function buildCombined(profiles: Map<string, Profile>): CombinedSample[] {
  const tSet = new Set<number>([T_MIN, T_MAX]);
  for (const profile of profiles.values()) {
    for (const w of profile.waypoints) tSet.add(w.tS);
  }
  const ts = [...tSet].sort((a, b) => a - b);
  return ts.map((t) => {
    const sample: CombinedSample = { tS: t };
    for (const [shotId, profile] of profiles.entries()) {
      const sorted = [...profile.waypoints].sort((a, b) => a.tS - b.tS);
      sample[`p_${shotId}`] = interpolate(sorted, t, 'pressureBar');
      sample[`f_${shotId}`] = interpolate(sorted, t, 'flowMls');
    }
    return sample;
  });
}

function interpolate(
  waypoints: Waypoint[],
  t: number,
  key: 'pressureBar' | 'flowMls',
): number {
  if (waypoints.length === 0) return 0;
  if (t <= waypoints[0]!.tS) return waypoints[0]![key];
  if (t >= waypoints[waypoints.length - 1]!.tS) return waypoints[waypoints.length - 1]![key];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i]!;
    const b = waypoints[i + 1]!;
    if (t >= a.tS && t <= b.tS) {
      const span = b.tS - a.tS;
      if (span === 0) return a[key];
      const ratio = (t - a.tS) / span;
      return a[key] + ratio * (b[key] - a[key]);
    }
  }
  return waypoints[waypoints.length - 1]![key];
}

export function ShotComparison(): ReactElement {
  const shots = useStore((s) => s.shots);
  const profiles = useStore((s) => s.profiles);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPressure, setShowPressure] = useState(true);
  const [showFlow, setShowFlow] = useState(true);

  function toggle(id: string): void {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, id];
    });
  }

  const selectedShots = useMemo(
    () =>
      selectedIds
        .map((id) => shots.find((s) => s.id === id))
        .filter((s): s is Shot => s !== undefined),
    [selectedIds, shots],
  );

  const profileMap = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const shot of selectedShots) {
      if (!shot.profileId) continue;
      const profile = profiles.find((p) => p.id === shot.profileId);
      if (profile) map.set(shot.id, profile);
    }
    return map;
  }, [selectedShots, profiles]);

  const combined = useMemo(() => buildCombined(profileMap), [profileMap]);

  const colorByShotId = useMemo(() => {
    const map = new Map<string, string>();
    selectedShots.forEach((shot, i) => {
      map.set(shot.id, SHOT_COLORS[i % SHOT_COLORS.length]!);
    });
    return map;
  }, [selectedShots]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Compare shots</h2>

      <p className="text-sm text-slate-600">
        Select 2–4 shots to overlay their pressure and flow curves.
      </p>

      <div className="flex flex-col gap-2">
        {shots.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Log some shots first to compare them here.
          </p>
        ) : (
          shots.map((shot) => {
            const isSelected = selectedIds.includes(shot.id);
            const color = colorByShotId.get(shot.id) ?? '#94a3b8';
            const profile = profiles.find((p) => p.id === shot.profileId);
            const ratio = shot.doseG > 0 ? (shot.yieldG / shot.doseG).toFixed(2) : '—';
            const disabled = !isSelected && selectedIds.length >= MAX_SELECTION;
            return (
              <button
                key={shot.id}
                type="button"
                onClick={() => toggle(shot.id)}
                disabled={disabled}
                className={`flex flex-col gap-1 rounded-lg border p-3 text-left text-sm transition ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <span
                        className="inline-block size-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    )}
                    <span className="font-medium">{shot.bean.name || '(unnamed bean)'}</span>
                  </div>
                  <span
                    className={`text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}
                  >
                    {new Date(shot.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div
                  className={`grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs sm:grid-cols-4 ${
                    isSelected ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  <span>Dose: {shot.doseG} g</span>
                  <span>Yield: {shot.yieldG} g</span>
                  <span>Ratio: 1:{ratio}</span>
                  <span>Time: {shot.timeS} s</span>
                  <span>Temp: {shot.tempC}°C</span>
                  <span>Rating: {shot.rating}/5</span>
                  <span className="col-span-2">Profile: {profile?.name ?? '(none)'}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {selectedShots.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={showPressure}
                onChange={(e) => setShowPressure(e.target.checked)}
                className="size-4 accent-slate-700"
              />
              Pressure
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={showFlow}
                onChange={(e) => setShowFlow(e.target.checked)}
                className="size-4 accent-slate-700"
              />
              Flow
            </label>
          </div>

          <div className="h-72 w-full rounded-lg border border-slate-200 bg-white sm:h-96">
            {profileMap.size === 0 ? (
              <p className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
                The selected shots have no profile attached. Pick shots that reference a profile.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={combined} margin={{ top: 12, right: 36, bottom: 28, left: 36 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    dataKey="tS"
                    domain={[T_MIN, T_MAX]}
                    ticks={[0, 5, 10, 15, 20, 25, 30, 35, 40, 45]}
                    tick={{ fontSize: 10 }}
                    stroke="#475569"
                  />
                  <YAxis
                    yAxisId="pressure"
                    domain={[P_MIN, P_MAX]}
                    ticks={[0, 2, 4, 6, 8, 10, 12]}
                    tick={{ fontSize: 10 }}
                    stroke="#475569"
                    width={32}
                  />
                  <YAxis
                    yAxisId="flow"
                    orientation="right"
                    domain={[F_MIN, F_MAX]}
                    ticks={[0, 2, 4, 6, 8, 10]}
                    tick={{ fontSize: 10 }}
                    stroke="#475569"
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(value: number, name: string) => [value.toFixed(2), name]}
                    labelFormatter={(label: number) => `t = ${label.toFixed(1)}s`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {selectedShots.flatMap((shot) => {
                    if (!profileMap.has(shot.id)) return [];
                    const color = colorByShotId.get(shot.id)!;
                    const label = shot.bean.name || `Shot ${shot.id.slice(-4)}`;
                    const lines: ReactElement[] = [];
                    if (showPressure) {
                      lines.push(
                        <Line
                          key={`p-${shot.id}`}
                          yAxisId="pressure"
                          type="linear"
                          dataKey={`p_${shot.id}`}
                          name={`${label} · pressure`}
                          stroke={color}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />,
                      );
                    }
                    if (showFlow) {
                      lines.push(
                        <Line
                          key={`f-${shot.id}`}
                          yAxisId="flow"
                          type="linear"
                          dataKey={`f_${shot.id}`}
                          name={`${label} · flow`}
                          stroke={color}
                          strokeWidth={2}
                          strokeDasharray="4 3"
                          dot={false}
                          isAnimationActive={false}
                        />,
                      );
                    }
                    return lines;
                  })}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Shot</th>
                  <th className="px-3 py-2 text-left">Dose</th>
                  <th className="px-3 py-2 text-left">Yield</th>
                  <th className="px-3 py-2 text-left">Ratio</th>
                  <th className="px-3 py-2 text-left">Time</th>
                  <th className="px-3 py-2 text-left">Temp</th>
                  <th className="px-3 py-2 text-left">Rating</th>
                  <th className="px-3 py-2 text-left">Profile</th>
                </tr>
              </thead>
              <tbody>
                {selectedShots.map((shot) => {
                  const profile = profiles.find((p) => p.id === shot.profileId);
                  const ratio = shot.doseG > 0 ? (shot.yieldG / shot.doseG).toFixed(2) : '—';
                  const color = colorByShotId.get(shot.id) ?? '#94a3b8';
                  return (
                    <tr key={shot.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block size-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          {shot.bean.name || '(unnamed)'}
                        </span>
                      </td>
                      <td className="px-3 py-2">{shot.doseG} g</td>
                      <td className="px-3 py-2">{shot.yieldG} g</td>
                      <td className="px-3 py-2">1:{ratio}</td>
                      <td className="px-3 py-2">{shot.timeS} s</td>
                      <td className="px-3 py-2">{shot.tempC} °C</td>
                      <td className="px-3 py-2">{shot.rating}/5</td>
                      <td className="px-3 py-2">{profile?.name ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
