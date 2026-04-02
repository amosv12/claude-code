import { v4 as uuidv4 } from 'uuid'
import type { Task, UIState } from '../types/task'

const TASKS_KEY = 'taskapp_tasks'
const UI_KEY = 'taskapp_ui'

export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Task[]
  } catch {
    return []
  }
}

export function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
  } catch {
    // ignore storage errors
  }
}

export function loadUIState(): Partial<UIState> {
  try {
    const raw = localStorage.getItem(UI_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Partial<UIState>
  } catch {
    return {}
  }
}

export function saveUIState(state: UIState): void {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(state))
  } catch {
    // ignore storage errors
  }
}

const now = new Date().toISOString()
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
const todayStr = new Date().toISOString().slice(0, 10)
const nextWeek = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)

export const SEED_TASKS: Task[] = [
  {
    id: uuidv4(),
    title: 'Set up project kickoff meeting',
    description: 'Coordinate with all stakeholders to align on goals, timeline, and responsibilities for the new project.',
    status: 'todo',
    priority: 'high',
    dueDate: todayStr,
    tags: ['planning', 'meetings'],
    createdAt: now,
    updatedAt: now,
    subtasks: [
      { id: uuidv4(), title: 'Send calendar invites', done: false },
      { id: uuidv4(), title: 'Prepare agenda document', done: true },
    ],
  },
  {
    id: uuidv4(),
    title: 'Research competitor landscape',
    description: 'Analyze top 5 competitors: pricing, features, and positioning. Summarize findings in a shared doc.',
    status: 'in-progress',
    priority: 'medium',
    dueDate: nextWeek,
    tags: ['research', 'strategy'],
    createdAt: now,
    updatedAt: now,
    subtasks: [],
  },
  {
    id: uuidv4(),
    title: 'Update team wiki with onboarding guide',
    description: 'Document the setup steps, tooling, and processes for new team members joining the project.',
    status: 'done',
    priority: 'low',
    dueDate: yesterday,
    tags: ['docs'],
    createdAt: now,
    updatedAt: now,
    subtasks: [
      { id: uuidv4(), title: 'Write environment setup section', done: true },
      { id: uuidv4(), title: 'Add FAQ section', done: true },
      { id: uuidv4(), title: 'Review with team lead', done: true },
    ],
  },
]
