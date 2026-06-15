import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  return (
    <div className="app-shell flex flex-col">
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-28">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
