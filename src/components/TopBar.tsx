import { useLocation, useNavigate } from 'react-router-dom'
import { Icon } from './Icon'
import { useApp } from '../store/AppContext'
import { FitCoreMark } from './FitCoreLogo'
import { shortDate, todayISO } from '../lib/date'
import './top-bar.css'

export function TopBar({ inset = false }: { inset?: boolean }) {
  const { profile } = useApp()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const initial = (profile.name.trim() || 'A').charAt(0).toUpperCase()
  const settings = pathname === '/settings'

  return (
    <header className={`fitcore-topbar ${inset ? 'is-inset' : ''}`}>
      <button type="button" className="fitcore-topbar-brand" onClick={() => nav('/')} aria-label="FitCore home"><FitCoreMark size={31} /><span>fitcore<span>.</span></span></button>
      <div className="fitcore-topbar-right"><span className="fitcore-topbar-date">{shortDate(todayISO())}</span><button type="button" className="fitcore-topbar-profile" onClick={() => nav(settings ? '/' : '/settings')} aria-label={settings ? 'Back to home' : 'Open profile and settings'}>{initial}<span><Icon name={settings ? 'arrow_back' : 'settings'} size={12} /></span></button></div>
    </header>
  )
}
