import type { Task } from '../types/task'
import { useTasks } from '../hooks/useTasks'
import { useFilters } from '../hooks/useFilters'
import { TaskCard } from './TaskCard'
import { EmptyState } from './EmptyState'

interface Props {
  onCreateTask: () => void
  onEditTask: (task: Task) => void
}

export function ListView({ onCreateTask, onEditTask }: Props) {
  const { tasks, filteredTasks } = useTasks()
  const { hasActiveFilters, clearFilters } = useFilters()

  if (tasks.length === 0) {
    return <EmptyState type="no-tasks" onCreateTask={onCreateTask} />
  }

  if (filteredTasks.length === 0) {
    return <EmptyState type="no-results" onClearFilters={clearFilters} />
  }

  return (
    <div className="px-4 py-4 max-w-6xl mx-auto w-full">
      <div className="space-y-2">
        {filteredTasks.map(task => (
          <TaskCard key={task.id} task={task} onEdit={onEditTask} />
        ))}
      </div>
    </div>
  )
}
