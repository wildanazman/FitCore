import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { showUpStreak } from '../lib/streak'
import { Icon } from './Icon'
import { useDialogFocus } from './useDialogFocus'
import './milestone-celebration.css'

export function MilestoneCelebration() {
  const { state, acknowledgeStreak } = useApp()
  const streak = showUpStreak(state)
  const unseen = streak.earned.filter(item => !(state.streakMilestonesSeen ?? []).includes(item.days))
  const milestone = unseen[unseen.length - 1]
  if (!milestone || !streak.todayDone) return null
  return <Celebration days={milestone.days} name={milestone.name} onDismiss={() => acknowledgeStreak(unseen.map(item => item.days))} />
}

function Celebration({ days, name, onDismiss }: { days: number; name: string; onDismiss: () => void }) {
  const reduced = useReducedMotion()
  const nav = useNavigate()
  const ref = useDialogFocus(onDismiss)
  return createPortal(<div className="milestone-overlay" onClick={onDismiss}>
    <motion.div ref={ref} role="dialog" aria-modal="true" aria-labelledby="milestone-title" aria-describedby="milestone-description" tabIndex={-1} className="milestone-dialog" onClick={event => event.stopPropagation()} initial={reduced ? false : { scale: 0.94, y: 18 }} animate={{ scale: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
      <button type="button" className="milestone-close" onClick={onDismiss} aria-label="Close celebration"><Icon name="close" size={22} /></button>
      <div className="milestone-stage" aria-hidden="true">
        {!reduced && <div className="milestone-confetti">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ '--x': `${Math.cos(i * Math.PI / 12) * (90 + i % 3 * 20)}px`, '--y': `${Math.sin(i * Math.PI / 12) * (85 + i % 4 * 12)}px`, '--turn': `${i * 47}deg`, '--delay': `${i % 4 * 0.035}s` } as React.CSSProperties} />)}</div>}
        <div className="milestone-burst" />
        <motion.div className="milestone-badge" initial={reduced ? false : { scale: 0.6, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}><Icon name="bolt" size={31} fill /><strong>{days}</strong><span>DAY STREAK</span></motion.div>
      </div>
      <div className="milestone-copy"><h2 id="milestone-title">Congrats,<br /><span>{days} days strong!</span></h2><p id="milestone-description">{name}. One small check-in at a time, you made this happen.</p><p className="milestone-unlocked"><Icon name="verified" size={19} />{days}-day achievement earned</p>
        <button type="button" className="milestone-primary" onClick={() => { onDismiss(); nav('/achievements') }}>See my achievement<Icon name="arrow_forward" size={19} /></button><button type="button" className="milestone-secondary" onClick={onDismiss}>Keep showing up</button>
      </div>
    </motion.div>
  </div>, document.body)
}
