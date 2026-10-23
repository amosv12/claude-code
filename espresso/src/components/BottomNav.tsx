import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/brew', label: 'Brew', icon: '⏱' },
  { to: '/shots', label: 'Shots', icon: '☕' },
  { to: '/beans', label: 'Beans', icon: '🫘' },
  { to: '/equipment', label: 'Gear', icon: '⚙' },
]

export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-800 bg-stone-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-lg">
        {tabs.map((t) => (
          <li key={t.to} className="flex-1">
            <NavLink
              to={t.to}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${
                  isActive ? 'font-semibold text-amber-500' : 'text-stone-400'
                }`
              }
            >
              <span aria-hidden className="text-xl leading-none">
                {t.icon}
              </span>
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
