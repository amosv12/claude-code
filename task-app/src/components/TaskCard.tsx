import { useState } from 'react'
import type { Task } from '../types/task'
import { useTasks } from '../hooks/useTasks'
import { getTagColor } from '../utils/tagColor'
import { formatDueDate, getDueDateAccent } from '../utils/dateHelpers'

interface Props {
  task: Task
  isDragging?: boolean
  onEdit: (task: Task) => void
}

const PRIORITY_COLORS = {
  high: 'bg-red-500',
  medium: 'bg-yellow-400',
  low: 'bg-blue-400',
}

const PRIORITY_TEXT_COLORS = {
  high: 'text-red-400',
  medium: 'text-yellow-400',
  low: 'text-blue-400',
}

const DUE_DATE_COLORS = {
  red: 'text-red-400',
  orange: 'text-orange-400',
}

export function TaskCard({ task, isDragging, onEdit }: Props) {
  const { ui, selectTask, deselectTask, deleteTask, duplicateTask } = useTasks()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isSelected = ui.selectedTaskIds.includes(task.id)
  const dueDateAccent = getDueDateAccent(task.dueDate)
  const doneCount = task.subtasks.filter(s => s.done).length
  const total = task.subtasks.length

  function handleCheckboxChange() {
    if (isSelected) deselectTask(task.id)
    else selectTask(task.id)
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirmDelete) {
      deleteTask(task.id)
    } else {
      setConfirmDelete(true)
    }
  }

  function handleDuplicate(e: React.MouseEvent) {
    e.stopPropagation()
    duplicateTask(task.id)
  }

  function handleEdit(e: React.MouseEvent) {
    e.stopPropagation()
    onEdit(task)
  }

  return (
    <div
      className={`
        relative bg-gray-900 border border-gray-800 rounded-lg p-3 cursor-pointer
        hover:border-gray-700 transition-colors group
        ${isDragging ? 'opacity-70 shadow-lg' : ''}
        ${isSelected ? 'border-blue-700 bg-blue-950/20' : ''}
      `}
      onClick={() => onEdit(task)}
    >
      {/* Priority indicator */}
      <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ml-0.5 ${PRIORITY_COLORS[task.priority]}`} />

      <div className="pl-2">
        {/* Top row: checkbox + title + actions */}
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            onClick={e => e.stopPropagation()}
            className="mt-0.5 w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-blue-500 cursor-pointer flex-shrink-0"
          />

          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium leading-snug ${task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-100'}`}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
            )}
          </div>

          {/* Action buttons */}
          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={handleEdit}
              className="p-1 text-gray-500 hover:text-gray-300 rounded transition-colors"
              aria-label="Edit"
              title="Edit"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={handleDuplicate}
              className="p-1 text-gray-500 hover:text-gray-300 rounded transition-colors"
              aria-label="Duplicate"
              title="Duplicate"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            {!confirmDelete ? (
              <button
                onClick={handleDelete}
                className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
                aria-label="Delete"
                title="Delete"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            ) : (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleDelete}
                  className="px-1.5 py-0.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded"
                >
                  Del?
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDelete(false) }}
                  className="px-1 py-0.5 text-xs text-gray-400 hover:text-gray-200"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {/* Priority badge */}
          <span className={`text-xs font-medium ${PRIORITY_TEXT_COLORS[task.priority]}`}>
            {task.priority}
          </span>

          {/* Due date */}
          {task.dueDate && (
            <span className={`text-xs ${dueDateAccent ? DUE_DATE_COLORS[dueDateAccent] : 'text-gray-500'}`}>
              {dueDateAccent === 'red' ? '⚠ ' : dueDateAccent === 'orange' ? '◉ ' : ''}
              {formatDueDate(task.dueDate)}
            </span>
          )}

          {/* Subtask progress */}
          {total > 0 && (
            <span className="text-xs text-gray-500">
              {doneCount}/{total} ✓
            </span>
          )}

          {/* Tags */}
          {task.tags.map(tag => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: getTagColor(tag) + '28', color: getTagColor(tag) }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Subtask progress bar (if subtasks exist) */}
        {total > 0 && (
          <div className="mt-2 h-0.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${(doneCount / total) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
