import { Navigate, Route, Routes } from 'react-router-dom'
import { useApp } from './store/AppContext'
import { AppLayout } from './components/AppLayout'
import { Onboarding } from './screens/Onboarding'
import { Home } from './screens/Home'
import { Food } from './screens/Food'
import { Camera } from './screens/Camera'
import { Train } from './screens/Train'
import { Body } from './screens/Body'
import { Settings } from './screens/Settings'

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
        <Route path="/food" element={<Food />} />
        <Route path="/train" element={<Train />} />
        <Route path="/body" element={<Body />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
