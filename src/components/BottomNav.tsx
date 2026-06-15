import { NavLink, useNavigate } from 'react-router-dom'
import { Icon } from './Icon'

const TABS = [
  { to: '/', icon: 'home', label: 'Home', end: true },
  { to: '/food', icon: 'nutrition', label: 'Food', end: false },
  { to: '/train', icon: 'fitness_center', label: 'Train', end: false },
  { to: '/body', icon: 'monitoring', label: 'Body', end: false },
]

export function BottomNav() {
  const nav = useNavigate()
  return (
    <nav className="absolute bottom-0 left-0 w-full z-50 bg-surface-container-low h-20 px-2 shadow-[0_-4px_24px_rgba(0,0,0,0.4)] flex items-center justify-around">
      {TABS.slice(0, 2).map((t) => (
        <Tab key={t.to} {...t} />
      ))}

      {/* Center camera FAB (quick-log) */}
      <button
        onClick={() => nav('/camera')}
        aria-label="Snap food photo"
        className="relative -mt-8 w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[0_8px_24px_rgba(197,192,255,0.35)] active:scale-95 transition"
      >
        <Icon name="photo_camera" fill size={30} />
      </button>

      {TABS.slice(2).map((t) => (
        <Tab key={t.to} {...t} />
      ))}
    </nav>
  )
}

function Tab({ to, icon, label, end }: { to: string; icon: string; label: string; end: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className="flex flex-col items-center justify-center gap-0.5 w-16 active:scale-90 transition"
    >
      {({ isActive }) => (
        <>
          <span
            className={
              isActive
                ? 'bg-primary-container text-on-primary-container rounded-full px-4 py-1 flex items-center justify-center'
                : 'text-on-surface-variant'
            }
          >
            <Icon name={icon} fill={isActive} />
          </span>
          <span className={`font-label-caps text-label-caps ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}
