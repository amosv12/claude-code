export type TaskStatus = 'todo' | 'in-progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
  tags: string[]
  createdAt: string
  updatedAt: string
  subtasks: Subtask[]
}

export interface UIState {
  view: 'list' | 'board'
  search: string
  filterStatus: TaskStatus[]
  filterPriority: TaskPriority[]
  filterTags: string[]
  filterDueDate: 'all' | 'overdue' | 'today' | 'this-week'
  selectedTaskIds: string[]
}
