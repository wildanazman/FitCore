import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Icon } from './Icon'
import { spring } from './motion'

const TABS = [
  { to: '/', icon: 'home', label: 'Home', end: true },
  { to: '/food', icon: 'nutrition', label: 'Food', end: false },
  { to: '/train', icon: 'fitness_center', label: 'Train', end: false },
  { to: '/body', icon: 'monitoring', label: 'Body', end: false },
]

export function BottomNav() {
  const nav = useNavigate()
  const { pathname } = useLocation()

  return (
    <div className="absolute bottom-4 inset-x-4 z-50 flex items-end justify-center gap-3">
      <nav className="flex-1 h-16 rounded-full bg-ink-card/95 backdrop-blur-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.5)] flex items-center justify-around px-2">
        {TABS.map((t) => {
          const active = t.end ? pathname === '/' : pathname.startsWith(t.to)
          return (
            <NavLink key={t.to} to={t.to} aria-label={t.label} className="relative w-12 h-12 flex items-center justify-center">
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  transition={spring}
                  className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-violet"
                />
              )}
              <Icon
                name={t.icon}
                fill={active}
                className={`relative z-10 transition-colors ${active ? 'text-white' : 'text-on-surface-variant'}`}
              />
            </NavLink>
          )
        })}
      </nav>

      {/* Lime quick-log FAB */}
      <motion.button
        onClick={() => nav('/camera')}
        aria-label="Snap food photo"
        whileTap={{ scale: 0.9 }}
        transition={spring}
        className="w-16 h-16 rounded-full bg-lime text-on-lime flex items-center justify-center shadow-[0_10px_28px_rgba(201,242,78,0.35)] shrink-0"
      >
        <Icon name="photo_camera" fill size={30} />
      </motion.button>
    </div>
  )
}
