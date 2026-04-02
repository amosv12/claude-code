import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Task, TaskStatus } from '../types/task'
import { useTasks } from '../hooks/useTasks'
import { useFilters } from '../hooks/useFilters'
import { TaskCard } from './TaskCard'
import { EmptyState } from './EmptyState'

interface Props {
  onCreateTask: () => void
  onEditTask: (task: Task) => void
}

interface ColumnProps {
  status: TaskStatus
  tasks: Task[]
  onEditTask: (task: Task) => void
  isDraggingOver?: boolean
}

function SortableTaskCard({ task, onEdit }: { task: Task; onEdit: (t: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} isDragging={isDragging} onEdit={onEdit} />
    </div>
  )
}

function DroppableColumn({ status, tasks, onEditTask }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  const COLUMN_LABELS: Record<TaskStatus, string> = {
    'todo': 'Todo',
    'in-progress': 'In Progress',
    'done': 'Done',
  }

  const COLUMN_HEADER_COLORS: Record<TaskStatus, string> = {
    'todo': 'text-blue-400',
    'in-progress': 'text-yellow-400',
    'done': 'text-green-400',
  }

  const COLUMN_BORDER_COLORS: Record<TaskStatus, string> = {
    'todo': 'border-blue-900/50',
    'in-progress': 'border-yellow-900/50',
    'done': 'border-green-900/50',
  }

  return (
    <div className={`flex flex-col rounded-xl border ${COLUMN_BORDER_COLORS[status]} bg-gray-900/50 min-h-[200px] transition-colors ${isOver ? 'bg-gray-800/60' : ''}`}>
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800/50">
        <span className={`text-sm font-semibold ${COLUMN_HEADER_COLORS[status]}`}>
          {COLUMN_LABELS[status]}
        </span>
        <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Droppable area */}
      <div ref={setNodeRef} className="flex-1 p-2 space-y-2 min-h-[120px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTaskCard key={task.id} task={task} onEdit={onEditTask} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className={`flex items-center justify-center h-24 rounded-lg border-2 border-dashed transition-colors ${isOver ? 'border-gray-600' : 'border-gray-800'}`}>
            <span className="text-xs text-gray-600">Drop here</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function BoardView({ onCreateTask, onEditTask }: Props) {
  const { tasks, filteredTasks, moveTask } = useTasks()
  const { hasActiveFilters, clearFilters } = useFilters()
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done']
  const columnTasks: Record<TaskStatus, Task[]> = {
    'todo': filteredTasks.filter(t => t.status === 'todo'),
    'in-progress': filteredTasks.filter(t => t.status === 'in-progress'),
    'done': filteredTasks.filter(t => t.status === 'done'),
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find(t => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    // Check if dropped on a column (status string) or on another card
    const targetStatus = STATUSES.includes(overId as TaskStatus)
      ? (overId as TaskStatus)
      : tasks.find(t => t.id === overId)?.status

    if (!targetStatus) return

    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    if (task.status !== targetStatus) {
      moveTask(taskId, targetStatus)
    }
  }

  if (tasks.length === 0) {
    return <EmptyState type="no-tasks" onCreateTask={onCreateTask} />
  }

  if (filteredTasks.length === 0 && hasActiveFilters) {
    return <EmptyState type="no-results" onClearFilters={clearFilters} />
  }

  return (
    <div className="px-4 py-4 max-w-6xl mx-auto w-full">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATUSES.map(status => (
            <DroppableColumn
              key={status}
              status={status}
              tasks={columnTasks[status]}
              onEditTask={onEditTask}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="rotate-1 shadow-2xl">
              <TaskCard task={activeTask} isDragging onEdit={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
