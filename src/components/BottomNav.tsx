import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Icon } from './Icon'
import { spring } from './motion'

const TABS = [
  { to: '/', icon: 'home', label: 'Home', end: true },
  { to: '/food', icon: 'nutrition', label: 'Food', end: false },
  { to: '/train', icon: 'fitness_center', label: 'Activity', end: false },
  { to: '/body', icon: 'monitoring', label: 'Body', end: false },
]

export function BottomNav() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const reducedMotion = useReducedMotion()

  return <div className="home-dock" data-testid="bottom-nav">
    <nav aria-label="Main navigation">{TABS.map((tab) => {
      const active = tab.end ? pathname === '/' : pathname.startsWith(tab.to) || (tab.to === '/train' && pathname.startsWith('/running'))
      return <NavLink key={tab.to} to={tab.to} end={tab.end} className={active ? 'is-active' : ''}>{active && <motion.i className="dock-selection" layoutId="dock-selection" transition={reducedMotion ? { duration: 0 } : spring} />}<Icon name={tab.icon} size={22} fill={active} /><span>{tab.label}</span></NavLink>
    })}</nav>
    <motion.button type="button" className="home-dock-camera" onClick={() => nav('/camera')} aria-label="Snap food photo" whileTap={reducedMotion ? undefined : { scale: 0.92 }} transition={spring}><Icon name="photo_camera" size={25} /><span>Scan</span></motion.button>
  </div>

}
