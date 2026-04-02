import { useEffect } from 'react'

interface ShortcutOptions {
  onNewTask: () => void
  onToggleShortcuts: () => void
  onEsc: () => void
  isModalOpen: boolean
}

export function useKeyboardShortcuts({ onNewTask, onToggleShortcuts, onEsc, isModalOpen }: ShortcutOptions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable

      if (e.key === 'Escape') {
        onEsc()
        return
      }

      if (isInput) return

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        onNewTask()
        return
      }

      if (e.key === '/') {
        e.preventDefault()
        const searchInput = document.getElementById('search-input')
        searchInput?.focus()
        return
      }

      if (e.key === '?') {
        e.preventDefault()
        onToggleShortcuts()
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onNewTask, onToggleShortcuts, onEsc, isModalOpen])
}
