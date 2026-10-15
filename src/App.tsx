import { Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { RouteLoading, StartupReady } from './components/Startup'
import { useApp } from './store/AppContext'
import { AppLayout } from './components/AppLayout'
import { Home } from './screens/Home'
const Onboarding = lazy(() => import('./screens/Onboarding').then(m => ({ default: m.Onboarding })))
const Achievements = lazy(() => import('./screens/Achievements').then(m => ({ default: m.Achievements })))
const Food = lazy(() => import('./screens/Food').then(m => ({ default: m.Food })))
const Camera = lazy(() => import('./screens/Camera').then(m => ({ default: m.Camera })))
const Train = lazy(() => import('./screens/Train').then(m => ({ default: m.Train })))
const Activity = lazy(() => import('./screens/Activity').then(m => ({ default: m.Activity })))
const Body = lazy(() => import('./screens/Body').then(m => ({ default: m.Body })))
const Settings = lazy(() => import('./screens/Settings').then(m => ({ default: m.Settings })))
const DietPlan = lazy(() => import('./screens/DietPlan').then(m => ({ default: m.DietPlan })))
const EatOut = lazy(() => import('./screens/EatOut').then(m => ({ default: m.EatOut })))

export default function App() {
  const { profile } = useApp()

  if (!profile.onboarded) {
    return (
      <div className="app-shell"><StartupReady /><Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="*" element={<Onboarding />} />
        </Routes>
      </Suspense></div>
    )
  }

  return (
    <><StartupReady /><Suspense fallback={<RouteLoading />}><Routes>
      {/* Camera is a full-screen flow without the bottom nav. */}
      <Route path="/camera" element={<Camera />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/food" element={<Food />} />
        <Route path="/eat-out" element={<EatOut />} />
        <Route path="/train" element={<Activity />} />
        <Route path="/running" element={<Train />} />
        <Route path="/body" element={<Body />} />
        <Route path="/diet" element={<DietPlan />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes></Suspense></>
  )
}
