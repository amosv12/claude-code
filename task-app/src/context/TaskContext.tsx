import React, { createContext, useReducer, useEffect, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Task, TaskStatus, TaskPriority, UIState, Subtask } from '../types/task'
import { loadTasks, saveTasks, loadUIState, saveUIState, SEED_TASKS } from '../utils/storage'
import { isOverdue, isDueToday, isDueThisWeek } from '../utils/dateHelpers'

// ─── State ────────────────────────────────────────────────────────────────────

export interface AppState {
  tasks: Task[]
  ui: UIState
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export type Action =
  | { type: 'ADD_TASK'; task: Task }
  | { type: 'UPDATE_TASK'; id: string; updates: Partial<Task> }
  | { type: 'DELETE_TASK'; id: string }
  | { type: 'DELETE_TASKS'; ids: string[] }
  | { type: 'DUPLICATE_TASK'; id: string }
  | { type: 'MOVE_TASK'; id: string; status: TaskStatus }
  | { type: 'TOGGLE_SUBTASK'; taskId: string; subtaskId: string }
  | { type: 'ADD_SUBTASK'; taskId: string; subtask: Subtask }
  | { type: 'DELETE_SUBTASK'; taskId: string; subtaskId: string }
  | { type: 'SET_VIEW'; view: 'list' | 'board' }
  | { type: 'SET_SEARCH'; search: string }
  | { type: 'SET_FILTER_STATUS'; statuses: TaskStatus[] }
  | { type: 'SET_FILTER_PRIORITY'; priorities: TaskPriority[] }
  | { type: 'SET_FILTER_TAGS'; tags: string[] }
  | { type: 'SET_FILTER_DUE'; filter: UIState['filterDueDate'] }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SELECT_TASK'; id: string }
  | { type: 'DESELECT_TASK'; id: string }
  | { type: 'SELECT_ALL'; ids: string[] }
  | { type: 'DESELECT_ALL' }
  | { type: 'BULK_SET_STATUS'; ids: string[]; status: TaskStatus }
  | { type: 'BULK_SET_PRIORITY'; ids: string[]; priority: TaskPriority }

// ─── Default UI ───────────────────────────────────────────────────────────────

const DEFAULT_UI: UIState = {
  view: 'list',
  search: '',
  filterStatus: [],
  filterPriority: [],
  filterTags: [],
  filterDueDate: 'all',
  selectedTaskIds: [],
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

function reducer(state: AppState, action: Action): AppState {
  const now = new Date().toISOString()

  switch (action.type) {
    case 'ADD_TASK':
      return { ...state, tasks: [action.task, ...state.tasks] }

    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.id ? { ...t, ...action.updates, updatedAt: now } : t
        ),
      }

    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.id),
        ui: {
          ...state.ui,
          selectedTaskIds: state.ui.selectedTaskIds.filter(id => id !== action.id),
        },
      }

    case 'DELETE_TASKS':
      return {
        ...state,
        tasks: state.tasks.filter(t => !action.ids.includes(t.id)),
        ui: { ...state.ui, selectedTaskIds: [] },
      }

    case 'DUPLICATE_TASK': {
      const original = state.tasks.find(t => t.id === action.id)
      if (!original) return state
      const copy: Task = {
        ...original,
        id: uuidv4(),
        title: `Copy of ${original.title}`,
        status: 'todo',
        createdAt: now,
        updatedAt: now,
        subtasks: original.subtasks.map(s => ({ ...s, id: uuidv4(), done: false })),
      }
      const idx = state.tasks.findIndex(t => t.id === action.id)
      const newTasks = [...state.tasks]
      newTasks.splice(idx + 1, 0, copy)
      return { ...state, tasks: newTasks }
    }

    case 'MOVE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.id ? { ...t, status: action.status, updatedAt: now } : t
        ),
      }

    case 'TOGGLE_SUBTASK':
      return {
        ...state,
        tasks: state.tasks.map(t => {
          if (t.id !== action.taskId) return t
          return {
            ...t,
            updatedAt: now,
            subtasks: t.subtasks.map(s =>
              s.id === action.subtaskId ? { ...s, done: !s.done } : s
            ),
          }
        }),
      }

    case 'ADD_SUBTASK':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.taskId
            ? { ...t, updatedAt: now, subtasks: [...t.subtasks, action.subtask] }
            : t
        ),
      }

    case 'DELETE_SUBTASK':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.taskId
            ? { ...t, updatedAt: now, subtasks: t.subtasks.filter(s => s.id !== action.subtaskId) }
            : t
        ),
      }

    case 'SET_VIEW':
      return { ...state, ui: { ...state.ui, view: action.view } }

    case 'SET_SEARCH':
      return { ...state, ui: { ...state.ui, search: action.search } }

    case 'SET_FILTER_STATUS':
      return { ...state, ui: { ...state.ui, filterStatus: action.statuses } }

    case 'SET_FILTER_PRIORITY':
      return { ...state, ui: { ...state.ui, filterPriority: action.priorities } }

    case 'SET_FILTER_TAGS':
      return { ...state, ui: { ...state.ui, filterTags: action.tags } }

    case 'SET_FILTER_DUE':
      return { ...state, ui: { ...state.ui, filterDueDate: action.filter } }

    case 'CLEAR_FILTERS':
      return {
        ...state,
        ui: {
          ...state.ui,
          search: '',
          filterStatus: [],
          filterPriority: [],
          filterTags: [],
          filterDueDate: 'all',
        },
      }

    case 'SELECT_TASK':
      if (state.ui.selectedTaskIds.includes(action.id)) return state
      return { ...state, ui: { ...state.ui, selectedTaskIds: [...state.ui.selectedTaskIds, action.id] } }

    case 'DESELECT_TASK':
      return {
        ...state,
        ui: { ...state.ui, selectedTaskIds: state.ui.selectedTaskIds.filter(id => id !== action.id) },
      }

    case 'SELECT_ALL':
      return { ...state, ui: { ...state.ui, selectedTaskIds: action.ids } }

    case 'DESELECT_ALL':
      return { ...state, ui: { ...state.ui, selectedTaskIds: [] } }

    case 'BULK_SET_STATUS':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          action.ids.includes(t.id) ? { ...t, status: action.status, updatedAt: now } : t
        ),
        ui: { ...state.ui, selectedTaskIds: [] },
      }

    case 'BULK_SET_PRIORITY':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          action.ids.includes(t.id) ? { ...t, priority: action.priority, updatedAt: now } : t
        ),
        ui: { ...state.ui, selectedTaskIds: [] },
      }

    default:
      return state
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

export interface TaskContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
  filteredTasks: Task[]
  allTags: string[]
}

export const TaskContext = createContext<TaskContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

function applyFilters(tasks: Task[], ui: UIState): Task[] {
  let result = tasks

  if (ui.search.trim()) {
    const q = ui.search.toLowerCase()
    result = result.filter(
      t =>
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false)
    )
  }

  if (ui.filterStatus.length > 0) {
    result = result.filter(t => ui.filterStatus.includes(t.status))
  }

  if (ui.filterPriority.length > 0) {
    result = result.filter(t => ui.filterPriority.includes(t.priority))
  }

  if (ui.filterTags.length > 0) {
    result = result.filter(t => ui.filterTags.some(tag => t.tags.includes(tag)))
  }

  if (ui.filterDueDate !== 'all') {
    result = result.filter(t => {
      if (ui.filterDueDate === 'overdue') return isOverdue(t.dueDate)
      if (ui.filterDueDate === 'today') return isDueToday(t.dueDate)
      if (ui.filterDueDate === 'this-week') return isDueThisWeek(t.dueDate)
      return true
    })
  }

  // Sort: priority (high → medium → low) then dueDate (asc, nulls last)
  result = [...result].sort((a, b) => {
    const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    if (pd !== 0) return pd
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.localeCompare(b.dueDate)
  })

  return result
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const savedTasks = loadTasks()
  const savedUI = loadUIState()

  const initialTasks = savedTasks.length > 0 ? savedTasks : SEED_TASKS
  const initialUI: UIState = { ...DEFAULT_UI, ...savedUI, selectedTaskIds: [] }

  const [state, dispatch] = useReducer(reducer, { tasks: initialTasks, ui: initialUI })

  useEffect(() => {
    saveTasks(state.tasks)
  }, [state.tasks])

  useEffect(() => {
    saveUIState(state.ui)
  }, [state.ui])

  const filteredTasks = useMemo(() => applyFilters(state.tasks, state.ui), [state.tasks, state.ui])

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    state.tasks.forEach(t => t.tags.forEach(tag => tagSet.add(tag)))
    return Array.from(tagSet).sort()
  }, [state.tasks])

  return (
    <TaskContext.Provider value={{ state, dispatch, filteredTasks, allTags }}>
      {children}
    </TaskContext.Provider>
  )
}
