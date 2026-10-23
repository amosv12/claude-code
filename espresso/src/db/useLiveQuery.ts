import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'

/** Re-runs `querier` whenever the IndexedDB data it reads changes. `undefined` while loading. */
export function useLiveQuery<T>(querier: () => Promise<T> | T, deps: readonly unknown[] = []): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined)
  useEffect(() => {
    const sub = liveQuery(querier).subscribe({
      next: setValue,
      error: (e) => console.error('IndexedDB query failed', e),
    })
    return () => sub.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return value
}
