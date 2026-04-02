import { useState, useCallback } from 'react'
import type { Task } from './types/task'
import { useTasks } from './hooks/useTasks'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { StatsBar } from './components/StatsBar'
import { FilterBar } from './components/FilterBar'
import { BulkActionBar } from './components/BulkActionBar'
import { ListView } from './components/ListView'
import { BoardView } from './components/BoardView'
import { TaskModal } from './components/TaskModal'
import { KeyboardShortcutOverlay } from './components/KeyboardShortcutOverlay'

export function App() {
  const { ui, dispatch } = useTasks()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>()
  const [showShortcuts, setShowShortcuts] = useState(false)

  const openNewTask = useCallback(() => {
    setEditingTask(undefined)
    setIsModalOpen(true)
  }, [])

  const openEditTask = useCallback((task: Task) => {
    setEditingTask(task)
    setIsModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setEditingTask(undefined)
  }, [])

  const handleEsc = useCallback(() => {
    if (isModalOpen) {
      closeModal()
    } else if (showShortcuts) {
      setShowShortcuts(false)
    } else if (ui.search) {
      dispatch({ type: 'SET_SEARCH', search: '' })
    }
  }, [isModalOpen, showShortcuts, ui.search, closeModal, dispatch])

  useKeyboardShortcuts({
    onNewTask: openNewTask,
    onToggleShortcuts: () => setShowShortcuts(v => !v),
    onEsc: handleEsc,
    isModalOpen,
  })

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h1 className="text-base font-semibold text-gray-100">Task Manager</h1>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-gray-800 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => dispatch({ type: 'SET_VIEW', view: 'list' })}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                ui.view === 'list' ? 'bg-gray-700 text-gray-100' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              List
            </button>
            <button
              onClick={() => dispatch({ type: 'SET_VIEW', view: 'board' })}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                ui.view === 'board' ? 'bg-gray-700 text-gray-100' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Board
            </button>
          </div>

          {/* New task button */}
          <button
            onClick={openNewTask}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <span className="text-base leading-none">+</span>
            New Task
          </button>

          <button
            onClick={() => setShowShortcuts(v => !v)}
            className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-gray-400 transition-colors text-sm font-mono border border-gray-700 hover:border-gray-600 rounded"
            title="Keyboard shortcuts (?)"
          >
            ?
          </button>
        </div>
      </header>

      <StatsBar />
      <FilterBar />
      <BulkActionBar />

      {/* Main content */}
      <main>
        {ui.view === 'list' ? (
          <ListView onCreateTask={openNewTask} onEditTask={openEditTask} />
        ) : (
          <BoardView onCreateTask={openNewTask} onEditTask={openEditTask} />
        )}
      </main>

      {/* Modals */}
      {isModalOpen && (
        <TaskModal task={editingTask} onClose={closeModal} />
      )}

      {showShortcuts && (
        <KeyboardShortcutOverlay onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  )
}
