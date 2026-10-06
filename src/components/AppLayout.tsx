import { useCallback, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { PullToRefresh } from './PullToRefresh'
import { useApp } from '../store/AppContext'
import { motion, useReducedMotion } from 'framer-motion'

export function AppLayout() {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const { refresh } = useApp()
  const home = location.pathname === '/'
  const reduced = useReducedMotion()

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 })
  }, [location.pathname])

  const handleRefresh = useCallback(async () => {
    refresh()
  }, [refresh])

  return (
    <div className={`app-shell flex flex-col bg-ink ${home ? 'app-shell-home' : ''}`}>
      <main ref={mainRef} className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden ${home ? 'home-scroll' : 'pb-28'}`}>
        <PullToRefresh onRefresh={handleRefresh} scrollRef={mainRef}>
          <motion.div key={location.pathname} className="app-route" initial={reduced ? false : { opacity: 0.85, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}><Outlet /></motion.div>
        </PullToRefresh>
      </main>
      <BottomNav />
    </div>
  )
}
