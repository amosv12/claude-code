import { useContext } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { TaskContext } from '../context/TaskContext'
import type { Task, TaskStatus, TaskPriority, Subtask } from '../types/task'

export function useTasks() {
  const ctx = useContext(TaskContext)
  if (!ctx) throw new Error('useTasks must be used inside TaskProvider')

  const { state, dispatch, filteredTasks, allTags } = ctx

  function createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString()
    const task: Task = { ...data, id: uuidv4(), createdAt: now, updatedAt: now }
    dispatch({ type: 'ADD_TASK', task })
  }

  function updateTask(id: string, updates: Partial<Task>) {
    dispatch({ type: 'UPDATE_TASK', id, updates })
  }

  function deleteTask(id: string) {
    dispatch({ type: 'DELETE_TASK', id })
  }

  function deleteTasks(ids: string[]) {
    dispatch({ type: 'DELETE_TASKS', ids })
  }

  function duplicateTask(id: string) {
    dispatch({ type: 'DUPLICATE_TASK', id })
  }

  function moveTask(id: string, status: TaskStatus) {
    dispatch({ type: 'MOVE_TASK', id, status })
  }

  function toggleSubtask(taskId: string, subtaskId: string) {
    dispatch({ type: 'TOGGLE_SUBTASK', taskId, subtaskId })
  }

  function addSubtask(taskId: string, title: string) {
    const subtask: Subtask = { id: uuidv4(), title, done: false }
    dispatch({ type: 'ADD_SUBTASK', taskId, subtask })
  }

  function deleteSubtask(taskId: string, subtaskId: string) {
    dispatch({ type: 'DELETE_SUBTASK', taskId, subtaskId })
  }

  function selectTask(id: string) {
    dispatch({ type: 'SELECT_TASK', id })
  }

  function deselectTask(id: string) {
    dispatch({ type: 'DESELECT_TASK', id })
  }

  function selectAll(ids: string[]) {
    dispatch({ type: 'SELECT_ALL', ids })
  }

  function deselectAll() {
    dispatch({ type: 'DESELECT_ALL' })
  }

  function bulkSetStatus(ids: string[], status: TaskStatus) {
    dispatch({ type: 'BULK_SET_STATUS', ids, status })
  }

  function bulkSetPriority(ids: string[], priority: TaskPriority) {
    dispatch({ type: 'BULK_SET_PRIORITY', ids, priority })
  }

  return {
    tasks: state.tasks,
    ui: state.ui,
    dispatch,
    filteredTasks,
    allTags,
    createTask,
    updateTask,
    deleteTask,
    deleteTasks,
    duplicateTask,
    moveTask,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    selectTask,
    deselectTask,
    selectAll,
    deselectAll,
    bulkSetStatus,
    bulkSetPriority,
  }
}
