import { useEffect } from 'react'

interface Props {
  onClose: () => void
}

const SHORTCUTS = [
  { key: 'N', description: 'Create new task' },
  { key: '/', description: 'Focus search input' },
  { key: 'Esc', description: 'Close modal / clear search' },
  { key: '?', description: 'Show this shortcut reference' },
]

export function KeyboardShortcutOverlay({ onClose }: Props) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-100">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <table className="w-full">
          <tbody className="divide-y divide-gray-800">
            {SHORTCUTS.map(({ key, description }) => (
              <tr key={key}>
                <td className="py-2.5 pr-4">
                  <kbd className="inline-block px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs font-mono text-gray-300 min-w-[2rem] text-center">
                    {key}
                  </kbd>
                </td>
                <td className="py-2.5 text-sm text-gray-400">{description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
