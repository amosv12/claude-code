import { classifyShot, daysOffRoast, extractionYield, outOfTarget, ratio, type Metric } from '../domain/brew'
import { formatGrams, formatRatio } from '../domain/numeric'
import { Button, EmptyState, Screen } from '../components/ui'
import { db } from '../db/db'
import type { Bean, Equipment, Shot } from '../db/schema'
import { useLiveQuery } from '../db/useLiveQuery'

const METRIC_LABEL: Record<Metric, string> = { ratio: 'Ratio', time: 'Time', ey: 'EY', temp: 'Temp' }

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)

function ShotRow({ shot, bean, equipment }: { shot: Shot; bean?: Bean; equipment: Map<number, Equipment> }) {
  const r = ratio(shot.doseG, shot.yieldG)
  const misses = outOfTarget(classifyShot(shot))
  const ey = extractionYield(shot.doseG, shot.yieldG, shot.tdsPct)
  const grinder = shot.grinderId !== undefined ? equipment.get(shot.grinderId) : undefined
  const machine = shot.machineId !== undefined ? equipment.get(shot.machineId) : undefined

  const remove = async () => {
    if (window.confirm('Delete this shot?')) await db.shots.delete(shot.id)
  }

  return (
    <li className="rounded-xl border border-stone-800 bg-stone-900/50">
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none flex-col gap-1 p-4 [&::-webkit-details-marker]:hidden">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-lg font-semibold">{bean?.name ?? 'Unknown bean'}</span>
            <span className="shrink-0 text-amber-500" aria-label={`Rating ${shot.rating} of 5`}>
              {stars(shot.rating)}
            </span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 text-stone-300">
            <span>
              {formatGrams(shot.doseG)} → {formatGrams(shot.yieldG)} g
            </span>
            <span>{formatRatio(r)}</span>
            <span>{shot.timeS.toFixed(1)} s</span>
          </div>
          {misses.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Outside target">
              {misses.map((m) => (
                <li
                  key={m.metric}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    m.flag === 'high' ? 'bg-red-950 text-red-300' : 'bg-sky-950 text-sky-300'
                  }`}
                >
                  {METRIC_LABEL[m.metric]} {m.flag}
                </li>
              ))}
            </ul>
          )}
        </summary>
        <div className="flex flex-col gap-1 border-t border-stone-800 p-4 text-sm text-stone-300">
          <p className="text-stone-500">{new Date(shot.createdAt).toLocaleString()}</p>
          {bean && <p>{daysOffRoast(shot.createdAt, bean.roastDate)} days off roast</p>}
          {shot.grindSetting && (
            <p>
              Grind {shot.grindSetting}
              {grinder && ` on ${grinder.name}`}
            </p>
          )}
          {machine && <p>Machine: {machine.name}</p>}
          {shot.tempC !== undefined && <p>{shot.tempC} °C</p>}
          {shot.pressureBar !== undefined && <p>{shot.pressureBar} bar</p>}
          {shot.preinfusionS !== undefined && <p>Pre-infusion {shot.preinfusionS} s</p>}
          {shot.tdsPct !== undefined && (
            <p>
              TDS {shot.tdsPct}%{ey !== undefined && ` → EY ${ey.toFixed(1)}%`}
            </p>
          )}
          {shot.tasteTags.length > 0 && <p className="capitalize">{shot.tasteTags.join(', ')}</p>}
          {shot.notes && <p className="text-stone-200">{shot.notes}</p>}
          <div className="pt-2">
            <Button variant="danger" onClick={remove}>
              Delete shot
            </Button>
          </div>
        </div>
      </details>
    </li>
  )
}

export default function Shots() {
  const data = useLiveQuery(async () => {
    const [shots, beans, equipment] = await Promise.all([
      db.shots.orderBy('createdAt').reverse().toArray(),
      db.beans.toArray(),
      db.equipment.toArray(),
    ])
    return {
      shots,
      beans: new Map(beans.map((b) => [b.id, b])),
      equipment: new Map(equipment.map((e) => [e.id, e])),
    }
  })

  if (data === undefined) return null

  return (
    <Screen title="Shots">
      {data.shots.length === 0 ? (
        <EmptyState
          title="No shots logged yet"
          body="Time a shot, log it, and it will show up here."
          action={{ label: 'Time your first shot', to: '/brew' }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {data.shots.map((s) => (
            <ShotRow key={s.id} shot={s} bean={data.beans.get(s.beanId)} equipment={data.equipment} />
          ))}
        </ul>
      )}
    </Screen>
  )
}
