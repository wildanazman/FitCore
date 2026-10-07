import { Navigate, Route, Routes } from 'react-router-dom'
import { useApp } from './store/AppContext'
import { AppLayout } from './components/AppLayout'
import { Onboarding } from './screens/Onboarding'
import { Home } from './screens/Home'
import { Achievements } from './screens/Achievements'
import { Food } from './screens/Food'
import { Camera } from './screens/Camera'
import { Train } from './screens/Train'
import { Activity } from './screens/Activity'
import { Body } from './screens/Body'
import { Settings } from './screens/Settings'
import { DietPlan } from './screens/DietPlan'
import { EatOut } from './screens/EatOut'

export default function App() {
  const { profile } = useApp()

  if (!profile.onboarded) {
    return (
      <div className="app-shell">
        <Routes>
          <Route path="*" element={<Onboarding />} />
        </Routes>
      </div>
    )
  }

  return (
    <Routes>
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
    </Routes>
  )
}
