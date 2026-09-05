import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import PatientDetail from './pages/PatientDetail'
import Requests from './pages/Requests'
import Notifications from './pages/Notifications'
import Audit from './pages/Audit'
import Demo from './pages/Demo'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/patients/:id" element={<PatientDetail />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
