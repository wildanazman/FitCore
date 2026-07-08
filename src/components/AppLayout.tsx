import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 })
  }, [location.pathname])

  return (
    <div className="app-shell flex flex-col bg-ink">
      <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-28">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
