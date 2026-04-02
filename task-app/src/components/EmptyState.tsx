interface Props {
  type: 'no-tasks' | 'no-results'
  onClearFilters?: () => void
  onCreateTask?: () => void
}

export function EmptyState({ type, onClearFilters, onCreateTask }: Props) {
  if (type === 'no-tasks') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <svg
          className="w-16 h-16 text-gray-700 mb-4"
          fill="none"
          viewBox="0 0 64 64"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <rect x="12" y="8" width="40" height="48" rx="4" strokeLinecap="round" />
          <line x1="20" y1="22" x2="44" y2="22" strokeLinecap="round" />
          <line x1="20" y1="30" x2="44" y2="30" strokeLinecap="round" />
          <line x1="20" y1="38" x2="36" y2="38" strokeLinecap="round" />
          <circle cx="22" cy="22" r="2" fill="currentColor" stroke="none" />
          <circle cx="22" cy="30" r="2" fill="currentColor" stroke="none" />
          <circle cx="22" cy="38" r="2" fill="currentColor" stroke="none" />
        </svg>
        <h2 className="text-xl font-medium text-gray-300 mb-2">No tasks yet</h2>
        <p className="text-gray-500 mb-6 text-sm max-w-xs">
          Get started by creating your first task. Stay organized and on top of your work.
        </p>
        {onCreateTask && (
          <button
            onClick={onCreateTask}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Create your first task
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <svg
        className="w-12 h-12 text-gray-700 mb-3"
        fill="none"
        viewBox="0 0 48 48"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <circle cx="24" cy="24" r="18" />
        <line x1="15" y1="15" x2="33" y2="33" strokeLinecap="round" />
        <line x1="33" y1="15" x2="15" y2="33" strokeLinecap="round" />
      </svg>
      <p className="text-gray-400 mb-3 text-sm">No tasks match your filters</p>
      {onClearFilters && (
        <button
          onClick={onClearFilters}
          className="text-blue-400 hover:text-blue-300 text-sm underline underline-offset-2 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
