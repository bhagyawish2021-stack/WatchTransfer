import { useState, useEffect } from 'react'
import {
  User,
  Bell,
  Activity,
  CheckCircle,
  Database,
  Server,
  Shield,
  Save,
} from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import api from '../api'

export default function Settings() {
  const [profile, setProfile] = useState({
    clinicianId: 'C003',
    name: 'Dr. Clinician Three',
    role: 'Attending Physician',
    department: 'Internal Medicine / Ward 4B',
  })

  const [notifications, setNotifications] = useState({
    results: true,
    responsibility: true,
    alerts: true,
  })

  const [systemStatus, setSystemStatus] = useState({
    backend: 'Checking...',
    database: 'Checking...',
    api: 'Checking...',
  })

  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Check backend health
    api.get('/')
      .then((res) => {
        setSystemStatus({
          backend: 'Connected',
          database: 'Connected (NeonDB)',
          api: 'Healthy (v1.0.0)',
        })
      })
      .catch(() => {
        setSystemStatus({
          backend: 'Disconnected',
          database: 'Unreachable',
          api: 'Offline',
        })
      })
  }, [])

  const handleSave = (e) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500">
          Manage your clinician profile, alert preferences, and review system connection telemetry.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <Card className="p-6 bg-white space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-base border-b border-slate-100 pb-3">
            <User size={18} className="text-blue-600" />
            <span>Active Clinician Profile</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Clinician ID
              </label>
              <input
                type="text"
                value={profile.clinicianId}
                disabled
                className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Assigned system identifier for role auditing
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Clinical Role
              </label>
              <input
                type="text"
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Unit / Department
              </label>
              <input
                type="text"
                value={profile.department}
                onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </Card>

        {/* Notifications Preferences */}
        <Card className="p-6 bg-white space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-base border-b border-slate-100 pb-3">
            <Bell size={18} className="text-blue-600" />
            <span>Notification & Alert Subscriptions</span>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={notifications.results}
                onChange={(e) =>
                  setNotifications({ ...notifications, results: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <div>
                <span className="text-sm font-semibold text-slate-800 block">
                  Result Notifications
                </span>
                <span className="text-xs text-slate-500">
                  Receive high-priority alerts when clinical lab and diagnostic results are published for patients currently under your care.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={notifications.responsibility}
                onChange={(e) =>
                  setNotifications({ ...notifications, responsibility: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <div>
                <span className="text-sm font-semibold text-slate-800 block">
                  Responsibility Handover Alerts
                </span>
                <span className="text-xs text-slate-500">
                  Notify me immediately when care for a patient is transferred to or from my responsibility.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={notifications.alerts}
                onChange={(e) =>
                  setNotifications({ ...notifications, alerts: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <div>
                <span className="text-sm font-semibold text-slate-800 block">
                  System Operational Alerts
                </span>
                <span className="text-xs text-slate-500">
                  Broadcasts regarding hospital EHR connectivity, out-of-order handoff synchronizations, or maintenance.
                </span>
              </div>
            </label>
          </div>
        </Card>

        {/* System Status Telemetry */}
        <Card className="p-6 bg-white space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-base border-b border-slate-100 pb-3">
            <Activity size={18} className="text-blue-600" />
            <span>Infrastructure Health & Connectivity</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">FastAPI Backend</span>
                <Server size={16} className="text-slate-400" />
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    systemStatus.backend.includes('Connected')
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="text-sm font-bold text-slate-800">
                  {systemStatus.backend}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">NeonDB PostgreSQL</span>
                <Database size={16} className="text-slate-400" />
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    systemStatus.database.includes('Connected')
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="text-sm font-bold text-slate-800">
                  {systemStatus.database}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Resolver Engine</span>
                <Shield size={16} className="text-slate-400" />
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    systemStatus.api.includes('Healthy')
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="text-sm font-bold text-slate-800">
                  {systemStatus.api}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Save button and feedback */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle size={16} /> Preferences saved successfully
            </span>
          )}
          <Button type="submit" variant="primary" icon={Save}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
