import { useRef, useState, type ReactNode, type TouchEvent } from 'react'

interface Props {
  onRefresh: () => Promise<void>
  children: ReactNode
  scrollRef: React.RefObject<HTMLElement | null>
}

export function PullToRefresh({ onRefresh, children, scrollRef }: Props) {
  const [phase, setPhase] = useState<'idle' | 'pulling' | 'threshold' | 'refreshing'>('idle')
  const startY = useRef(0)
  const pulled = useRef(0)
  const THRESHOLD = 60

  const handleTouchStart = (e: TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop > 0) return
    startY.current = e.touches[0].clientY
    pulled.current = 0
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (phase === 'refreshing') return
    if (scrollRef.current && scrollRef.current.scrollTop > 0) {
      setPhase('idle')
      return
    }
    const dist = Math.max(0, e.touches[0].clientY - startY.current)
    pulled.current = dist
    setPhase(dist > THRESHOLD ? 'threshold' : 'pulling')
  }

  const handleTouchEnd = async () => {
    if (phase === 'threshold') {
      setPhase('refreshing')
      try {
        await onRefresh()
      } finally {
        setPhase('idle')
      }
    } else {
      setPhase('idle')
    }
  }

  const offset = phase === 'refreshing' ? THRESHOLD : phase === 'idle' ? 0 : Math.min(pulled.current, THRESHOLD)
  const noTransition = phase === 'pulling'

  return (
    <div
      className="relative min-h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="absolute left-0 right-0 z-50 flex items-center justify-center"
        style={{
          top: phase === 'idle' ? -THRESHOLD : -THRESHOLD + offset,
          height: THRESHOLD,
          transition: noTransition ? 'none' : 'top 0.3s ease',
        }}
      >
        {phase === 'refreshing' ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-lime border-t-transparent rounded-full animate-spin" />
            <span className="text-lime text-sm font-medium">Refreshing...</span>
          </div>
        ) : phase === 'threshold' ? (
          <span className="text-lime text-sm font-medium">Release to refresh</span>
        ) : (
          <span className="text-on-surface-variant text-sm">Pull to refresh</span>
        )}
      </div>

      <div
        className="min-h-full"
        style={{
          transform: `translateY(${offset}px)`,
          transition: noTransition ? 'none' : 'transform 0.3s ease',
        }}
      >
        {children}
      </div>
    </div>
  )
}
