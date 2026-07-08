import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BottomNav } from './BottomNav'
import { screenVariants } from './motion'

export function AppLayout() {
  const location = useLocation()
  return (
    <div className="app-shell flex flex-col bg-ink">
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-28">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  )
}
