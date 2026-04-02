import { useTasks } from '../hooks/useTasks'

export function StatsBar() {
  const { tasks } = useTasks()

  const total = tasks.length
  const done = tasks.filter(t => t.status === 'done').length
  const inProgress = tasks.filter(t => t.status === 'in-progress').length
  const todo = tasks.filter(t => t.status === 'todo').length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const stats = [
    { label: 'Total', value: total, color: 'text-gray-300' },
    { label: 'Todo', value: todo, color: 'text-blue-400' },
    { label: 'In Progress', value: inProgress, color: 'text-yellow-400' },
    { label: 'Done', value: done, color: 'text-green-400' },
  ]

  return (
    <div className="border-b border-gray-800 px-4 py-3">
      <div className="max-w-6xl mx-auto space-y-2">
        <div className="flex flex-wrap gap-4 sm:gap-6">
          {stats.map(s => (
            <div key={s.label} className="flex items-baseline gap-1.5">
              <span className={`text-xl font-semibold tabular-nums ${s.color}`}>{s.value}</span>
              <span className="text-xs text-gray-500">{s.label}</span>
            </div>
          ))}
          <div className="ml-auto flex items-baseline gap-1.5">
            <span className="text-xl font-semibold tabular-nums text-gray-300">{pct}%</span>
            <span className="text-xs text-gray-500">complete</span>
          </div>
        </div>

        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
