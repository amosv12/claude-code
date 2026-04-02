import { useState } from 'react'
import { useTasks } from '../hooks/useTasks'
import type { TaskPriority } from '../types/task'

export function BulkActionBar() {
  const { ui, filteredTasks, tasks, bulkSetStatus, bulkSetPriority, deleteTasks, selectAll, deselectAll } = useTasks()
  const { selectedTaskIds } = ui
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (selectedTaskIds.length === 0) return null

  const allFilteredIds = filteredTasks.map(t => t.id)
  const allSelected = allFilteredIds.every(id => selectedTaskIds.includes(id))

  function handleDeleteConfirm() {
    deleteTasks(selectedTaskIds)
    setConfirmDelete(false)
  }

  const priorities: TaskPriority[] = ['high', 'medium', 'low']
  const priorityLabel: Record<TaskPriority, string> = { high: 'High', medium: 'Medium', low: 'Low' }

  return (
    <div className="border-b border-gray-800 bg-gray-900/80 px-4 py-2">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-300 font-medium">
          {selectedTaskIds.length} task{selectedTaskIds.length !== 1 ? 's' : ''} selected
        </span>

        <button
          onClick={() => allSelected ? deselectAll() : selectAll(allFilteredIds)}
          className="text-xs text-gray-400 hover:text-gray-200 underline underline-offset-2"
        >
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => bulkSetStatus(selectedTaskIds, 'done')}
            className="text-xs px-3 py-1.5 bg-green-800/60 hover:bg-green-700/60 text-green-300 rounded-md transition-colors"
          >
            Mark Done
          </button>

          <div className="relative">
            <button
              onClick={() => setShowPriorityMenu(v => !v)}
              className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
            >
              Set Priority ▾
            </button>
            {showPriorityMenu && (
              <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 min-w-[110px]">
                {priorities.map(p => (
                  <button
                    key={p}
                    onClick={() => { bulkSetPriority(selectedTaskIds, p); setShowPriorityMenu(false) }}
                    className="block w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                  >
                    {priorityLabel[p]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs px-3 py-1.5 bg-red-900/60 hover:bg-red-800/60 text-red-300 rounded-md transition-colors"
            >
              Delete
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">Confirm?</span>
              <button
                onClick={handleDeleteConfirm}
                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
              >
                No
              </button>
            </div>
          )}

          <button
            onClick={deselectAll}
            className="text-xs text-gray-500 hover:text-gray-300 ml-1"
            aria-label="Clear selection"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
