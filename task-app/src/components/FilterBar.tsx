import { useState, useRef, useEffect } from 'react'
import { useTasks } from '../hooks/useTasks'
import { useFilters } from '../hooks/useFilters'
import type { TaskStatus, TaskPriority } from '../types/task'
import { getTagColor } from '../utils/tagColor'

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const DUE_OPTIONS = [
  { value: 'all', label: 'All dates' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'this-week', label: 'Due this week' },
] as const

interface DropdownProps {
  label: string
  children: React.ReactNode
}

function Dropdown({ label, children }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="text-sm px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-colors flex items-center gap-1"
      >
        {label}
        <span className="text-gray-500 text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-30 min-w-[140px] py-1">
          {children}
        </div>
      )}
    </div>
  )
}

export function FilterBar() {
  const { ui, dispatch, allTags } = useTasks()
  const { hasActiveFilters, clearFilters } = useFilters()

  function toggleStatus(s: TaskStatus) {
    const next = ui.filterStatus.includes(s)
      ? ui.filterStatus.filter(x => x !== s)
      : [...ui.filterStatus, s]
    dispatch({ type: 'SET_FILTER_STATUS', statuses: next })
  }

  function togglePriority(p: TaskPriority) {
    const next = ui.filterPriority.includes(p)
      ? ui.filterPriority.filter(x => x !== p)
      : [...ui.filterPriority, p]
    dispatch({ type: 'SET_FILTER_PRIORITY', priorities: next })
  }

  function toggleTag(tag: string) {
    const next = ui.filterTags.includes(tag)
      ? ui.filterTags.filter(x => x !== tag)
      : [...ui.filterTags, tag]
    dispatch({ type: 'SET_FILTER_TAGS', tags: next })
  }

  return (
    <div className="border-b border-gray-800 px-4 py-3 space-y-2">
      <div className="max-w-6xl mx-auto flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">⌕</span>
          <input
            id="search-input"
            type="text"
            value={ui.search}
            onChange={e => dispatch({ type: 'SET_SEARCH', search: e.target.value })}
            placeholder="Search tasks..."
            className="w-full pl-8 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-500"
          />
          {ui.search && (
            <button
              onClick={() => dispatch({ type: 'SET_SEARCH', search: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              ×
            </button>
          )}
        </div>

        {/* Status Filter */}
        <Dropdown label={ui.filterStatus.length > 0 ? `Status (${ui.filterStatus.length})` : 'Status'}>
          {STATUS_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={ui.filterStatus.includes(opt.value)}
                onChange={() => toggleStatus(opt.value)}
                className="text-blue-500"
              />
              <span className="text-sm text-gray-300">{opt.label}</span>
            </label>
          ))}
        </Dropdown>

        {/* Priority Filter */}
        <Dropdown label={ui.filterPriority.length > 0 ? `Priority (${ui.filterPriority.length})` : 'Priority'}>
          {PRIORITY_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={ui.filterPriority.includes(opt.value)}
                onChange={() => togglePriority(opt.value)}
                className="text-blue-500"
              />
              <span className="text-sm text-gray-300">{opt.label}</span>
            </label>
          ))}
        </Dropdown>

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <Dropdown label={ui.filterTags.length > 0 ? `Tags (${ui.filterTags.length})` : 'Tags'}>
            {allTags.map(tag => (
              <label key={tag} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ui.filterTags.includes(tag)}
                  onChange={() => toggleTag(tag)}
                  className="text-blue-500"
                />
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ backgroundColor: getTagColor(tag) + '33', color: getTagColor(tag) }}
                >
                  {tag}
                </span>
              </label>
            ))}
          </Dropdown>
        )}

        {/* Due Date Filter */}
        <select
          value={ui.filterDueDate}
          onChange={e => dispatch({ type: 'SET_FILTER_DUE', filter: e.target.value as typeof ui.filterDueDate })}
          className="text-sm px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
        >
          {DUE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-400 hover:text-gray-200 underline underline-offset-2"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="max-w-6xl mx-auto flex flex-wrap gap-1.5">
          {ui.search.trim() && (
            <FilterChip label={`"${ui.search}"`} onRemove={() => dispatch({ type: 'SET_SEARCH', search: '' })} />
          )}
          {ui.filterStatus.map(s => (
            <FilterChip
              key={s}
              label={s === 'in-progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
              onRemove={() => dispatch({ type: 'SET_FILTER_STATUS', statuses: ui.filterStatus.filter(x => x !== s) })}
            />
          ))}
          {ui.filterPriority.map(p => (
            <FilterChip
              key={p}
              label={p.charAt(0).toUpperCase() + p.slice(1)}
              onRemove={() => dispatch({ type: 'SET_FILTER_PRIORITY', priorities: ui.filterPriority.filter(x => x !== p) })}
            />
          ))}
          {ui.filterTags.map(tag => (
            <FilterChip
              key={tag}
              label={tag}
              color={getTagColor(tag)}
              onRemove={() => dispatch({ type: 'SET_FILTER_TAGS', tags: ui.filterTags.filter(x => x !== tag) })}
            />
          ))}
          {ui.filterDueDate !== 'all' && (
            <FilterChip
              label={DUE_OPTIONS.find(o => o.value === ui.filterDueDate)?.label ?? ui.filterDueDate}
              onRemove={() => dispatch({ type: 'SET_FILTER_DUE', filter: 'all' })}
            />
          )}
        </div>
      )}
    </div>
  )
}

function FilterChip({ label, onRemove, color }: { label: string; onRemove: () => void; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
      style={color
        ? { backgroundColor: color + '22', borderColor: color + '55', color }
        : undefined}
    >
      {!color && <span className="text-gray-300">{label}</span>}
      {color && label}
      <button
        onClick={onRemove}
        className="hover:opacity-70 ml-0.5"
        style={color ? undefined : { color: '#9ca3af' }}
        aria-label={`Remove ${label} filter`}
      >
        ×
      </button>
    </span>
  )
}
