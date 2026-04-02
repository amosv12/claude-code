import { useTasks } from './useTasks'

export function useFilters() {
  const { ui, dispatch } = useTasks()

  const hasActiveFilters =
    ui.search.trim() !== '' ||
    ui.filterStatus.length > 0 ||
    ui.filterPriority.length > 0 ||
    ui.filterTags.length > 0 ||
    ui.filterDueDate !== 'all'

  const activeFilterCount =
    (ui.search.trim() ? 1 : 0) +
    ui.filterStatus.length +
    ui.filterPriority.length +
    ui.filterTags.length +
    (ui.filterDueDate !== 'all' ? 1 : 0)

  function clearFilters() {
    dispatch({ type: 'CLEAR_FILTERS' })
  }

  return { hasActiveFilters, activeFilterCount, clearFilters }
}
