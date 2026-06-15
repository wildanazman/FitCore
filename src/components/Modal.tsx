import type { ReactNode } from 'react'
import { Icon } from './Icon'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

/** Bottom-sheet modal scoped to the phone frame (used for confirm/edit/log flows). */
export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-surface-container rounded-t-2xl border-t border-tile-border p-margin-mobile pb-8 animate-fade-in max-h-[90%] overflow-y-auto">
        {title !== undefined && (
          <div className="flex items-center justify-between mb-md">
            <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container-high"
            >
              <Icon name="close" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

interface TabsProps<T extends string> {
  tabs: { value: T; label: string }[]
  active: T
  onChange: (v: T) => void
}

/** Pill segmented control matching the design mockups. */
export function Tabs<T extends string>({ tabs, active, onChange }: TabsProps<T>) {
  return (
    <div className="flex gap-sm overflow-x-auto no-scrollbar">
      {tabs.map((t) => {
        const on = t.value === active
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`shrink-0 px-md py-sm rounded-full font-body-md text-sm transition border ${
              on
                ? 'bg-primary-container text-on-primary-container border-transparent'
                : 'bg-transparent text-on-surface-variant border-outline-variant hover:border-primary/40'
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
