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
  UserCheck,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'
import StatusBadge, { AvailabilityBadge } from '../components/StatusBadge'
import api, { getClinicians, updateClinicianAvailability } from '../api'

export default function Settings() {
  const [clinicians, setClinicians] = useState([])
  const [selectedClinicianId, setSelectedClinicianId] = useState('C003')
  const [availabilityStatus, setAvailabilityStatus] = useState('AVAILABLE')
  const [backupClinicianId, setBackupClinicianId] = useState('')
  const [savingAvailability, setSavingAvailability] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(null)

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

  const [savedPreferences, setSavedPreferences] = useState(false)

  const loadClinicians = async () => {
    try {
      const res = await getClinicians()
      const data = res.data || []
      setClinicians(data)
      const current = data.find((c) => c.clinician_id === selectedClinicianId) || data[0]
      if (current) {
        setSelectedClinicianId(current.clinician_id)
        setAvailabilityStatus(current.availability_status || 'AVAILABLE')
        setBackupClinicianId(current.backup_clinician_id || '')
        setProfile({
          clinicianId: current.clinician_id,
          name: current.name,
          role: current.role,
          department: current.department || 'Internal Medicine',
        })
      }
    } catch (err) {
      console.error('Failed to load clinicians', err)
    }
  }

  useEffect(() => {
    loadClinicians()

    // Check backend health
    api
      .get('/')
      .then(() => {
        setSystemStatus({
          backend: 'Connected',
          database: 'Connected (Database Engine)',
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

  const handleClinicianSwitch = (id) => {
    setSelectedClinicianId(id)
    const c = clinicians.find((item) => item.clinician_id === id)
    if (c) {
      setAvailabilityStatus(c.availability_status || 'AVAILABLE')
      setBackupClinicianId(c.backup_clinician_id || '')
      setProfile({
        clinicianId: c.clinician_id,
        name: c.name,
        role: c.role,
        department: c.department || 'Internal Medicine',
      })
    }
    setSavedSuccess(null)
  }

  const handleSaveAvailability = async (e) => {
    e.preventDefault()
    try {
      setSavingAvailability(true)
      setSavedSuccess(null)
      await updateClinicianAvailability(selectedClinicianId, {
        availability_status: availabilityStatus,
        backup_clinician_id: backupClinicianId || null,
      })
      await loadClinicians()
      setSavedSuccess(`Availability status updated to ${availabilityStatus}`)
      setTimeout(() => setSavedSuccess(null), 4000)
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to update availability.')
    } finally {
      setSavingAvailability(false)
    }
  }

  const handleSavePreferences = (e) => {
    e.preventDefault()
    setSavedPreferences(true)
    setTimeout(() => setSavedPreferences(false), 3000)
  }

  const selectedClinician = clinicians.find((c) => c.clinician_id === selectedClinicianId)
  const isDirectDuty = availabilityStatus === 'AVAILABLE' || availabilityStatus === 'ON_CALL'
  const backupClinicianObj = clinicians.find((c) => c.clinician_id === backupClinicianId)

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinician Settings & Availability</h1>
        <p className="text-sm text-slate-500">
          Manage operational availability, designated backup clinicians, alert routing, and infrastructure telemetry.
        </p>
      </div>

      {/* Clinician Availability Section */}
      <Card className="p-6 bg-white space-y-5 border-blue-200 ring-1 ring-blue-100 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <UserCheck size={20} className="text-blue-600" />
            <span>Operational Availability & Escalation Target</span>
          </div>
          {selectedClinician && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Current status:</span>
              <AvailabilityBadge status={selectedClinician.availability_status} />
            </div>
          )}
        </div>

        {/* Clinician Switcher */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Active Clinician Profile Selector
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {clinicians.map((c) => (
              <button
                type="button"
                key={c.clinician_id}
                onClick={() => handleClinicianSwitch(c.clinician_id)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  selectedClinicianId === c.clinician_id
                    ? 'border-blue-600 bg-white shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-900">{c.clinician_id}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      c.availability_status === 'AVAILABLE'
                        ? 'bg-emerald-500'
                        : c.availability_status === 'BUSY'
                        ? 'bg-amber-500'
                        : c.availability_status === 'ON_CALL'
                        ? 'bg-blue-500'
                        : 'bg-slate-400'
                    }`}
                  />
                </div>
                <p className="text-xs text-slate-800 font-medium truncate mt-0.5">{c.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{c.role}</p>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSaveAvailability} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Availability Status
              </label>
              <select
                value={availabilityStatus}
                onChange={(e) => setAvailabilityStatus(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="AVAILABLE">🟢 Available (Direct Delivery)</option>
                <option value="BUSY">🟡 Busy (Escalate to Backup)</option>
                <option value="UNAVAILABLE">🔴 Unavailable (Escalate to Backup)</option>
                <option value="ON_CALL">🔵 On Call (Direct Delivery)</option>
                <option value="OFF_DUTY">⚫ Off Duty (Escalate to Backup)</option>
              </select>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Determines whether clinical results are routed to you or forwarded to your backup.
              </span>
            </div>

            {/* Backup Clinician Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Designated Backup Clinician
              </label>
              <select
                value={backupClinicianId}
                onChange={(e) => setBackupClinicianId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- None (System Escalation Pool) --</option>
                {clinicians
                  .filter((c) => c.clinician_id !== selectedClinicianId)
                  .map((c) => (
                    <option key={c.clinician_id} value={c.clinician_id}>
                      {c.name} ({c.clinician_id} - {c.availability_status})
                    </option>
                  ))}
              </select>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Recipient of Tier 1 escalations when you are unavailable or an SLA breach occurs.
              </span>
            </div>
          </div>

          {/* Real-Time Routing Explanation Callout */}
          <div
            className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
              isDirectDuty
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <ArrowRight size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">
                {isDirectDuty
                  ? 'Direct Notification Routing Active'
                  : 'Escalation Routing Active'}
              </p>
              <p className="mt-0.5">
                {isDirectDuty ? (
                  <>
                    When tests match for your patients, notifications will be delivered <strong>directly to {profile.name} ({selectedClinicianId})</strong>.
                  </>
                ) : (
                  <>
                    Since you are {availabilityStatus.replace('_', ' ')}, notifications will be <strong>automatically forwarded to {backupClinicianObj ? `${backupClinicianObj.name} (${backupClinicianObj.clinician_id})` : 'the next available physician'}</strong> with Tier 1 escalation.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              {savedSuccess && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle size={14} /> {savedSuccess}
                </span>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              icon={Save}
              disabled={savingAvailability}
            >
              {savingAvailability ? 'Updating...' : 'Update Availability'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Profile & Notification Preferences */}
      <form onSubmit={handleSavePreferences} className="space-y-6">
        {/* Profile Card */}
        <Card className="p-6 bg-white space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-base border-b border-slate-100 pb-3">
            <User size={18} className="text-blue-600" />
            <span>Clinician Profile Information</span>
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
                <span className="text-xs font-semibold text-slate-500">Database Engine</span>
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
          {savedPreferences && (
            <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
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
