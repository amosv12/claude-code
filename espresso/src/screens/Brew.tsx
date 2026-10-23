import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShotForm } from '../components/ShotForm'
import { EmptyState, Screen } from '../components/ui'
import { db } from '../db/db'
import type { NewShot } from '../db/schema'
import { useLiveQuery } from '../db/useLiveQuery'
import { elapsedMs, formatElapsed, parseStoredStart, toSeconds } from '../domain/timer'

const STORAGE_KEY = 'espresso.timer.startedAt'

function readStoredStart(): number | null {
  try {
    return parseStoredStart(localStorage.getItem(STORAGE_KEY), Date.now())
  } catch {
    return null
  }
}

function writeStoredStart(startedAt: number | null): void {
  try {
    if (startedAt === null) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, String(startedAt))
  } catch {
    // Storage unavailable (private mode): the timer still works, it just won't survive a reload.
  }
}

interface Finished {
  timeS: number
  stoppedAt: number
}

export default function Brew() {
  const navigate = useNavigate()
  const data = useLiveQuery(async () => ({
    beans: await db.beans.orderBy('name').toArray(),
    equipment: await db.equipment.toArray(),
    previous: (await db.shots.orderBy('createdAt').last()) ?? null,
  }))

  const [startedAt, setStartedAt] = useState<number | null>(readStoredStart)
  const [now, setNow] = useState(() => Date.now())
  const [finished, setFinished] = useState<Finished | null>(null)

  // Repaint only; the displayed time is always Date.now() − startedAt, so missed ticks
  // (screen lock, background throttling) can't make it drift.
  useEffect(() => {
    if (startedAt === null) return
    const tick = () => setNow(Date.now())
    tick()
    const id = window.setInterval(tick, 50)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [startedAt])

  const toggle = useCallback(() => {
    if (startedAt === null) {
      const t = Date.now()
      writeStoredStart(t)
      setNow(t)
      setStartedAt(t)
    } else {
      const stoppedAt = Date.now()
      writeStoredStart(null)
      setFinished({ timeS: toSeconds(elapsedMs(startedAt, stoppedAt)), stoppedAt })
      setStartedAt(null)
    }
  }, [startedAt])

  if (data === undefined) return null

  if (data.beans.length === 0) {
    return (
      <Screen title="Brew">
        <EmptyState
          title="Add a bean first"
          body="Every shot is logged against a bean, so add the coffee you're about to pull."
          action={{ label: 'Add your first bean', to: '/beans' }}
        />
      </Screen>
    )
  }

  if (finished) {
    const save = async (shot: NewShot) => {
      await db.shots.add(shot)
      setFinished(null)
      navigate('/shots')
    }
    return (
      <Screen title="Log shot">
        <ShotForm
          beans={data.beans}
          equipment={data.equipment}
          previous={data.previous}
          timeS={finished.timeS}
          createdAt={finished.stoppedAt}
          onSave={save}
          onDiscard={() => setFinished(null)}
        />
      </Screen>
    )
  }

  const running = startedAt !== null
  const elapsed = running ? elapsedMs(startedAt, now) : 0

  return (
    <Screen title="Brew">
      <button
        type="button"
        onClick={toggle}
        aria-label={running ? 'Stop shot timer' : 'Start shot timer'}
        className={`flex h-[60vh] min-h-72 w-full select-none flex-col items-center justify-center gap-3 rounded-3xl border-2 transition-colors ${
          running
            ? 'border-red-500 bg-red-950/60 active:bg-red-950'
            : 'border-amber-500 bg-amber-500/10 active:bg-amber-500/20'
        }`}
      >
        <span className="text-8xl font-bold tabular-nums">{formatElapsed(elapsed)}</span>
        <span className="text-xl text-stone-300">{running ? 'Tap to stop' : 'Tap to start'}</span>
      </button>
    </Screen>
  )
}
