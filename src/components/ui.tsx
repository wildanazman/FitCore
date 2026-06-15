import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { CoachBrief } from '../lib/coach'

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">{children}</h3>
  )
}

const TONE_BORDER: Record<CoachBrief['tone'], string> = {
  primary: 'border-primary',
  secondary: 'border-secondary',
  tertiary: 'border-tertiary',
  error: 'border-error',
}
const TONE_BG: Record<CoachBrief['tone'], string> = {
  primary: 'bg-primary/10',
  secondary: 'bg-secondary/10',
  tertiary: 'bg-tertiary/10',
  error: 'bg-error/10',
}
const TONE_TEXT: Record<CoachBrief['tone'], string> = {
  primary: 'text-on-primary-container',
  secondary: 'text-on-secondary-container',
  tertiary: 'text-on-tertiary-container',
  error: 'text-on-error-container',
}
const TONE_ICONWRAP: Record<CoachBrief['tone'], string> = {
  primary: 'bg-primary-container text-on-primary-container',
  secondary: 'bg-secondary-container text-on-secondary',
  tertiary: 'bg-tertiary-container text-on-tertiary-container',
  error: 'bg-error-container text-on-error-container',
}

export function CoachCard({ brief }: { brief: CoachBrief }) {
  return (
    <section
      className={`${TONE_BG[brief.tone]} border-l-2 ${TONE_BORDER[brief.tone]} rounded-r-xl rounded-bl-xl p-md flex gap-md items-start shadow-[0_8px_24px_rgba(0,0,0,0.2)] animate-fade-in`}
    >
      <div className={`w-8 h-8 rounded-full ${TONE_ICONWRAP[brief.tone]} flex items-center justify-center shrink-0`}>
        <Icon name={brief.icon} fill size={18} />
      </div>
      <div>
        <p className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant mb-0.5">
          {brief.headline}
        </p>
        <p className={`font-body-md text-body-md ${TONE_TEXT[brief.tone]}`}>{brief.body}</p>
      </div>
    </section>
  )
}

interface MetricTileProps {
  label: string
  value: ReactNode
  unit?: string
  pct?: number
  barColor?: string
  onClick?: () => void
}

export function MetricTile({ label, value, unit, pct, barColor = 'bg-primary', onClick }: MetricTileProps) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-tile border border-tile-border rounded-xl p-md flex flex-col justify-between relative overflow-hidden group hover:border-primary/50 transition-colors min-h-[120px] w-full"
    >
      <div>
        <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase">{label}</h3>
        <div className="font-display-hero text-display-hero text-on-surface mt-sm group-hover:text-primary transition-colors leading-none">
          {value}
          {unit && <span className="text-metric-md font-metric-md text-on-surface-variant"> {unit}</span>}
        </div>
      </div>
      {pct !== undefined && (
        <div className="w-full h-base bg-surface-container-highest rounded-full mt-lg overflow-hidden">
          <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
        </div>
      )}
    </button>
  )
}

export function ProgressBar({ pct, color = 'bg-primary', className = '' }: { pct: number; color?: string; className?: string }) {
  return (
    <div className={`w-full bg-surface-container-high rounded-full h-2 overflow-hidden ${className}`}>
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  )
}

export function Chip({ children, tone = 'primary' }: { children: ReactNode; tone?: 'primary' | 'secondary' | 'tertiary' | 'error' }) {
  const map = {
    primary: 'bg-primary/10 text-primary border-primary/30',
    secondary: 'bg-secondary/10 text-secondary border-secondary/30',
    tertiary: 'bg-tertiary/10 text-tertiary border-tertiary/30',
    error: 'bg-error/10 text-error border-error/30',
  }
  return (
    <span className={`px-sm py-xs rounded-full border font-data-mono text-[11px] uppercase ${map[tone]}`}>{children}</span>
  )
}

export function PrimaryButton({ children, onClick, className = '', type = 'button', disabled }: { children: ReactNode; onClick?: () => void; className?: string; type?: 'button' | 'submit'; disabled?: boolean }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`bg-primary text-on-primary font-metric-md text-metric-md py-3 px-6 rounded-full hover:opacity-90 active:scale-[0.98] transition disabled:opacity-40 flex items-center justify-center gap-2 ${className}`}
    >
      {children}
    </button>
  )
}

export function GhostButton({ children, onClick, className = '' }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`bg-transparent border border-outline text-on-surface font-metric-md text-metric-md py-3 px-6 rounded-full hover:bg-surface-container-high active:scale-[0.98] transition flex items-center justify-center gap-2 ${className}`}
    >
      {children}
    </button>
  )
}
