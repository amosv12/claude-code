import { isToday, isBefore, isAfter, endOfWeek, startOfDay, parseISO, format } from 'date-fns'

export function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false
  const date = parseISO(dueDate)
  const todayStart = startOfDay(new Date())
  return isBefore(date, todayStart)
}

export function isDueToday(dueDate?: string): boolean {
  if (!dueDate) return false
  return isToday(parseISO(dueDate))
}

export function isDueThisWeek(dueDate?: string): boolean {
  if (!dueDate) return false
  const date = parseISO(dueDate)
  const now = new Date()
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  return isAfter(date, now) && isBefore(date, weekEnd)
}

export function formatDueDate(dueDate?: string): string {
  if (!dueDate) return ''
  const date = parseISO(dueDate)
  if (isToday(date)) return 'Today'
  return format(date, 'MMM d')
}

export type DueDateAccent = 'red' | 'orange' | null

export function getDueDateAccent(dueDate?: string): DueDateAccent {
  if (!dueDate) return null
  if (isOverdue(dueDate)) return 'red'
  if (isDueToday(dueDate)) return 'orange'
  return null
}
