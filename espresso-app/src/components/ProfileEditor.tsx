import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
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
import type { Profile, Waypoint } from '../types';

const T_MIN = 0;
const T_MAX = 45;
const P_MIN = 0;
const P_MAX = 12;
const F_MIN = 0;
const F_MAX = 10;

const CHART_MARGIN = { top: 12, right: 48, bottom: 28, left: 40 } as const;

const PRESSURE_COLOR = '#dc2626';
const FLOW_COLOR = '#2563eb';

interface ProfileEditorProps {
  profile: Profile;
  onChange: (profile: Profile) => void;
  readOnly?: boolean;
}

interface DragState {
  series: 'pressure' | 'flow';
  index: number;
  pointerId: number;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  index?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sortWaypoints(wps: Waypoint[]): Waypoint[] {
  return [...wps].sort((a, b) => a.tS - b.tS);
}

export function ProfileEditor({ profile, onChange, readOnly = false }: ProfileEditorProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const profileRef = useRef(profile);
  const onChangeRef = useRef(onChange);
  const readOnlyRef = useRef(readOnly);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  profileRef.current = profile;
  onChangeRef.current = onChange;
  readOnlyRef.current = readOnly;

  const sortedWaypoints = useMemo(() => sortWaypoints(profile.waypoints), [profile.waypoints]);

  useEffect(() => {
    function handleMove(e: PointerEvent): void {
      const drag = dragRef.current;
      const container = containerRef.current;
      if (!drag || !container) return;
      if (e.pointerId !== drag.pointerId) return;
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const plotLeft = rect.left + CHART_MARGIN.left;
      const plotRight = rect.right - CHART_MARGIN.right;
      const plotTop = rect.top + CHART_MARGIN.top;
      const plotBottom = rect.bottom - CHART_MARGIN.bottom;
      const plotWidth = plotRight - plotLeft;
      const plotHeight = plotBottom - plotTop;
      if (plotWidth <= 0 || plotHeight <= 0) return;

      const tRaw = T_MIN + ((e.clientX - plotLeft) / plotWidth) * (T_MAX - T_MIN);
      const yFrac = (e.clientY - plotTop) / plotHeight;

      const current = profileRef.current.waypoints;
      const sorted = sortWaypoints(current);
      const original = sorted[drag.index];
      if (!original) return;

      const prev = sorted[drag.index - 1];
      const next = sorted[drag.index + 1];
      const minT = prev ? prev.tS + 0.1 : T_MIN;
      const maxT = next ? next.tS - 0.1 : T_MAX;
      const tS = round2(clamp(tRaw, minT, maxT));

      const updated: Waypoint = { ...original, tS };
      if (drag.series === 'pressure') {
        const p = P_MAX - yFrac * (P_MAX - P_MIN);
        updated.pressureBar = round2(clamp(p, P_MIN, P_MAX));
      } else {
        const f = F_MAX - yFrac * (F_MAX - F_MIN);
        updated.flowMls = round2(clamp(f, F_MIN, F_MAX));
      }

      const indexInOriginal = current.findIndex(
        (w) => w.tS === original.tS && w.pressureBar === original.pressureBar && w.flowMls === original.flowMls,
      );
      if (indexInOriginal === -1) return;
      const nextWaypoints = [...current];
      nextWaypoints[indexInOriginal] = updated;
      onChangeRef.current({ ...profileRef.current, waypoints: nextWaypoints });
    }

    function handleUp(e: PointerEvent): void {
      const drag = dragRef.current;
      if (drag && e.pointerId === drag.pointerId) {
        dragRef.current = null;
        setDraggingKey(null);
      }
    }

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, []);

  function startDrag(series: 'pressure' | 'flow', index: number, e: React.PointerEvent<SVGCircleElement>): void {
    if (readOnlyRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* setPointerCapture may throw if pointer no longer active */
    }
    dragRef.current = { series, index, pointerId: e.pointerId };
    setDraggingKey(`${series}-${index}`);
  }

  function makeDotRenderer(series: 'pressure' | 'flow', color: string) {
    return function renderDot(props: CustomDotProps): ReactElement<SVGElement> {
      const { cx, cy, index } = props;
      if (cx === undefined || cy === undefined || index === undefined) {
        return <g />;
      }
      const isDragging = draggingKey === `${series}-${index}`;
      return (
        <circle
          cx={cx}
          cy={cy}
          r={isDragging ? 10 : 7}
          fill={color}
          stroke="white"
          strokeWidth={2}
          style={{
            cursor: readOnly ? 'default' : isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
          onPointerDown={(ev) => startDrag(series, index, ev)}
        />
      );
    };
  }

  function updateWaypointAt(index: number, patch: Partial<Waypoint>): void {
    const current = sortWaypoints(profile.waypoints);
    const target = current[index];
    if (!target) return;
    const updated: Waypoint = { ...target, ...patch };
    const others = current.filter((_, i) => i !== index);
    const allowedMin = others
      .filter((w) => w.tS < target.tS)
      .reduce((acc, w) => Math.max(acc, w.tS + 0.1), T_MIN);
    const allowedMax = others
      .filter((w) => w.tS > target.tS)
      .reduce((acc, w) => Math.min(acc, w.tS - 0.1), T_MAX);
    updated.tS = clamp(round2(updated.tS), allowedMin, allowedMax);
    updated.pressureBar = clamp(round2(updated.pressureBar), P_MIN, P_MAX);
    updated.flowMls = clamp(round2(updated.flowMls), F_MIN, F_MAX);
    const next = [...current];
    next[index] = updated;
    onChange({ ...profile, waypoints: next });
  }

  function removeWaypointAt(index: number): void {
    if (profile.waypoints.length <= 2) return;
    const current = sortWaypoints(profile.waypoints);
    const next = current.filter((_, i) => i !== index);
    onChange({ ...profile, waypoints: next });
  }

  function addWaypoint(): void {
    const current = sortWaypoints(profile.waypoints);
    if (current.length === 0) {
      onChange({
        ...profile,
        waypoints: [{ tS: 0, pressureBar: 0, flowMls: 0 }],
      });
      return;
    }
    let bestGap = -1;
    let bestIndex = 0;
    for (let i = 0; i < current.length - 1; i++) {
      const gap = current[i + 1]!.tS - current[i]!.tS;
      if (gap > bestGap) {
        bestGap = gap;
        bestIndex = i;
      }
    }
    const lastT = current[current.length - 1]!.tS;
    if (T_MAX - lastT > bestGap) {
      const last = current[current.length - 1]!;
      const next = [
        ...current,
        { tS: round2((lastT + T_MAX) / 2), pressureBar: last.pressureBar, flowMls: last.flowMls },
      ];
      onChange({ ...profile, waypoints: next });
      return;
    }
    const a = current[bestIndex]!;
    const b = current[bestIndex + 1]!;
    const inserted: Waypoint = {
      tS: round2((a.tS + b.tS) / 2),
      pressureBar: round2((a.pressureBar + b.pressureBar) / 2),
      flowMls: round2((a.flowMls + b.flowMls) / 2),
    };
    const next = [...current.slice(0, bestIndex + 1), inserted, ...current.slice(bestIndex + 1)];
    onChange({ ...profile, waypoints: next });
  }

  const renderPressureDot = useMemo(() => makeDotRenderer('pressure', PRESSURE_COLOR), [draggingKey, readOnly]);
  const renderFlowDot = useMemo(() => makeDotRenderer('flow', FLOW_COLOR), [draggingKey, readOnly]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={profile.showPressure}
            disabled={readOnly}
            onChange={(e) => onChange({ ...profile, showPressure: e.target.checked })}
            className="size-4 accent-red-600"
          />
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-full bg-red-600" />
            Pressure (bar)
          </span>
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={profile.showFlow}
            disabled={readOnly}
            onChange={(e) => onChange({ ...profile, showFlow: e.target.checked })}
            className="size-4 accent-blue-600"
          />
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-full bg-blue-600" />
            Flow (ml/s)
          </span>
        </label>
      </div>

      <div
        ref={containerRef}
        className="relative h-72 w-full select-none rounded-lg border border-slate-200 bg-white sm:h-80"
        style={{ touchAction: 'none' }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={sortedWaypoints} margin={{ ...CHART_MARGIN }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number"
              dataKey="tS"
              domain={[T_MIN, T_MAX]}
              ticks={[0, 5, 10, 15, 20, 25, 30, 35, 40, 45]}
              tick={{ fontSize: 10 }}
              stroke="#475569"
              allowDataOverflow
            />
            <YAxis
              yAxisId="pressure"
              domain={[P_MIN, P_MAX]}
              ticks={[0, 2, 4, 6, 8, 10, 12]}
              tick={{ fontSize: 10, fill: PRESSURE_COLOR }}
              stroke={PRESSURE_COLOR}
              width={32}
              allowDataOverflow
            />
            <YAxis
              yAxisId="flow"
              orientation="right"
              domain={[F_MIN, F_MAX]}
              ticks={[0, 2, 4, 6, 8, 10]}
              tick={{ fontSize: 10, fill: FLOW_COLOR }}
              stroke={FLOW_COLOR}
              width={32}
              allowDataOverflow
            />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(value: number, name: string) => [value.toFixed(2), name]}
              labelFormatter={(label: number) => `t = ${label.toFixed(1)}s`}
            />
            <Legend wrapperStyle={{ display: 'none' }} />
            {profile.showPressure && (
              <Line
                yAxisId="pressure"
                type="linear"
                dataKey="pressureBar"
                name="Pressure"
                stroke={PRESSURE_COLOR}
                strokeWidth={2}
                isAnimationActive={false}
                dot={renderPressureDot}
                activeDot={false}
              />
            )}
            {profile.showFlow && (
              <Line
                yAxisId="flow"
                type="linear"
                dataKey="flowMls"
                name="Flow"
                stroke={FLOW_COLOR}
                strokeWidth={2}
                isAnimationActive={false}
                dot={renderFlowDot}
                activeDot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-slate-500">
        {readOnly
          ? 'Read-only preview. Duplicate this profile to edit.'
          : 'Drag the colored dots to reshape the curve. Use the table below for precise values.'}
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-2 py-2 text-left">#</th>
              <th className="px-2 py-2 text-left">Time (s)</th>
              <th className="px-2 py-2 text-left">Pressure (bar)</th>
              <th className="px-2 py-2 text-left">Flow (ml/s)</th>
              <th className="px-2 py-2 text-right" />
            </tr>
          </thead>
          <tbody>
            {sortedWaypoints.map((w, i) => (
              <tr key={`${i}-${w.tS}`} className="border-t border-slate-100">
                <td className="px-2 py-1.5 text-slate-500">{i + 1}</td>
                <td className="px-1 py-1.5">
                  <input
                    type="number"
                    step="0.1"
                    min={T_MIN}
                    max={T_MAX}
                    value={w.tS}
                    disabled={readOnly}
                    onChange={(e) => updateWaypointAt(i, { tS: Number(e.target.value) })}
                    className="w-20 rounded border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50"
                  />
                </td>
                <td className="px-1 py-1.5">
                  <input
                    type="number"
                    step="0.1"
                    min={P_MIN}
                    max={P_MAX}
                    value={w.pressureBar}
                    disabled={readOnly}
                    onChange={(e) => updateWaypointAt(i, { pressureBar: Number(e.target.value) })}
                    className="w-20 rounded border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50"
                  />
                </td>
                <td className="px-1 py-1.5">
                  <input
                    type="number"
                    step="0.1"
                    min={F_MIN}
                    max={F_MAX}
                    value={w.flowMls}
                    disabled={readOnly}
                    onChange={(e) => updateWaypointAt(i, { flowMls: Number(e.target.value) })}
                    className="w-20 rounded border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50"
                  />
                </td>
                <td className="px-2 py-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => removeWaypointAt(i)}
                    disabled={readOnly || profile.waypoints.length <= 2}
                    className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <button
          type="button"
          onClick={addWaypoint}
          disabled={readOnly}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Add waypoint
        </button>
      </div>
    </div>
  );
}
