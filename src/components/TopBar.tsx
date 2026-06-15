import { useNavigate } from 'react-router-dom'
import { Icon } from './Icon'
import { useApp } from '../store/AppContext'

export function TopBar({ greeting }: { greeting?: boolean }) {
  const { profile } = useApp()
  const nav = useNavigate()
  const initial = (profile.name || 'A').trim().charAt(0).toUpperCase()
  const hour = new Date().getHours()
  const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md px-margin-mobile pt-lg pb-sm flex items-center justify-between">
      {greeting ? (
        <div>
          <h2 className="font-body-md text-body-md text-on-surface-variant">Good {part},</h2>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{profile.name || 'Athlete'}</h1>
        </div>
      ) : (
        <div className="flex items-center gap-sm">
          <Avatar initial={initial} />
          <span className="font-display-hero text-headline-lg-mobile text-primary tracking-tighter">FitCore</span>
        </div>
      )}
      <div className="flex items-center gap-sm">
        {greeting && <Avatar initial={initial} size={48} />}
        <button
          onClick={() => nav('/settings')}
          aria-label="Settings"
          className="text-primary p-2 rounded-full hover:bg-surface-container-high active:scale-95 transition"
        >
          <Icon name="settings" />
        </button>
      </div>
    </header>
  )
}

function Avatar({ initial, size = 40 }: { initial: string; size?: number }) {
  return (
    <div
      className="rounded-full bg-primary-container text-on-primary-container border border-outline-variant flex items-center justify-center font-metric-md"
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  )
}
