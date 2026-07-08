import { useCallback, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { PullToRefresh } from './PullToRefresh'
import { useApp } from '../store/AppContext'

export function AppLayout() {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const { refresh } = useApp()

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 })
  }, [location.pathname])

  const handleRefresh = useCallback(async () => {
    refresh()
  }, [refresh])

  return (
    <div className="app-shell flex flex-col bg-ink">
      <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-28">
        <PullToRefresh onRefresh={handleRefresh} scrollRef={mainRef}>
          <Outlet />
        </PullToRefresh>
      </main>
      <BottomNav />
    </div>
  )
}
