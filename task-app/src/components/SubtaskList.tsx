import React, { useState } from 'react'
import type { Subtask } from '../types/task'
import { useTasks } from '../hooks/useTasks'

interface Props {
  taskId: string
  subtasks: Subtask[]
  onMarkTaskDone?: () => void
}

export function SubtaskList({ taskId, subtasks, onMarkTaskDone }: Props) {
  const { toggleSubtask, addSubtask, deleteSubtask, updateTask } = useTasks()
  const [newTitle, setNewTitle] = useState('')

  const doneCount = subtasks.filter(s => s.done).length
  const total = subtasks.length

  function handleToggle(subtaskId: string, currentDone: boolean) {
    toggleSubtask(taskId, subtaskId)
    if (!currentDone) {
      // Check if this will complete all subtasks
      const willAllBeDone = subtasks.every(s => s.id === subtaskId ? true : s.done)
      if (willAllBeDone && subtasks.length > 0) {
        setTimeout(() => {
          if (window.confirm('All subtasks done — mark task as Done?')) {
            updateTask(taskId, { status: 'done' })
            onMarkTaskDone?.()
          }
        }, 50)
      }
    }
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title || subtasks.length >= 20) return
    addSubtask(taskId, title)
    setNewTitle('')
  }

  return (
    <div className="space-y-2">
      {total > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{doneCount} / {total} done</span>
          <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: total > 0 ? `${(doneCount / total) * 100}%` : '0%' }}
            />
          </div>
        </div>
      )}

      <ul className="space-y-1">
        {subtasks.map(subtask => (
          <li key={subtask.id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={subtask.done}
              onChange={() => handleToggle(subtask.id, subtask.done)}
              className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-blue-500 cursor-pointer flex-shrink-0"
            />
            <span className={`text-sm flex-1 ${subtask.done ? 'line-through text-gray-500' : 'text-gray-200'}`}>
              {subtask.title}
            </span>
            <button
              onClick={() => deleteSubtask(taskId, subtask.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity text-xs"
              aria-label="Remove subtask"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {subtasks.length < 20 && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Add subtask..."
            className="flex-1 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-500"
          />
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded disabled:opacity-40 transition-colors"
          >
            Add
          </button>
        </form>
      )}
      {subtasks.length >= 20 && (
        <p className="text-xs text-gray-500">Maximum 20 subtasks reached.</p>
      )}
    </div>
  )
}
