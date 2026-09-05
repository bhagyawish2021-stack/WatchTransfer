import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, ClipboardList, Bell, FileClock,
  CheckCircle, Clock, ChevronRight, Activity,
} from 'lucide-react'
import { getPatients, getRequests, getNotifications, getAuditLogs } from '../api'
import { formatTime, eventTypeColor } from '../utils'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import { SkeletonCard } from '../components/Skeleton'
import ErrorState from '../components/ErrorState'

function KpiCard({ icon: Icon, label, value, sub, color }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </Card>
  )
}

function TimelineEvent({ event }) {
  const colorClass = eventTypeColor(event.event_type)
  return (
    <div className="flex gap-3 items-start">
      <div className="flex flex-col items-center">
        <span className={`w-2.5 h-2.5 rounded-full border-2 ${
          event.event_type === 'RESPONSIBILITY_RESOLVED'
            ? 'bg-emerald-500 border-emerald-300'
            : event.event_type.includes('HANDOFF')
            ? 'bg-amber-400 border-amber-200'
            : 'bg-blue-500 border-blue-200'
        } flex-shrink-0 mt-1`} />
      </div>
      <div className="flex-1 pb-4 border-b border-slate-50 last:border-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colorClass}`}>
            {event.event_type.replace(/_/g, ' ')}
          </span>
          <span className="text-xs text-slate-400">{formatTime(event.created_at)}</span>
        </div>
        <p className="text-sm text-slate-700 mt-1">{event.description}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [patients, setPatients] = useState([])
  const [requests, setRequests] = useState([])
  const [notifications, setNotifications] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const [p, r, n, a] = await Promise.allSettled([
        getPatients(),
        getRequests(),
        getNotifications(),
        getAuditLogs(),
      ])

      if (p.status === 'fulfilled') setPatients(p.value.data || [])
      if (r.status === 'fulfilled') setRequests(r.value.data || [])
      if (n.status === 'fulfilled') setNotifications(n.value.data || [])
      if (a.status === 'fulfilled') setAuditLogs(a.value.data || [])

      if (p.status === 'rejected' && r.status === 'rejected' && n.status === 'rejected') {
        const msg = p.reason?.response?.data?.detail || p.reason?.message || 'Unable to connect to backend service.'
        setError(`Unable to load dashboard data: ${msg}`)
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Unable to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const pending = notifications.filter(n => n.status === 'PENDING')
  const activeReqs = requests.filter(r => r.status === 'ACTIVE')
  const recentAudit = [...auditLogs].reverse().slice(0, 8)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            {greeting}, Dr. C003
          </h2>
          <p className="text-slate-500 mt-1 text-sm">
            Here's your clinical responsibility overview.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          System Operational
        </span>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} rows={2} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Users}       label="Active Patients"       value={patients.length}       color="bg-blue-600"    sub="Monitored patients" />
          <KpiCard icon={ClipboardList} label="Active Requests"     value={activeReqs.length}     color="bg-sky-500"     sub="Standing requests" />
          <KpiCard icon={Bell}        label="Pending Notifications"  value={pending.length}        color="bg-amber-500"   sub="Require attention" />
          <KpiCard icon={FileClock}   label="Audit Events"          value={auditLogs.length}      color="bg-slate-600"   sub="Total records" />
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Current Responsibilities */}
        <div className="lg:col-span-3">
          <Card>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Current Responsibilities</h3>
              <Link to="/patients" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View all <ChevronRight size={14} />
              </Link>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">
                {[...Array(3)].map((_, i) => <SkeletonCard key={i} rows={1} />)}
              </div>
            ) : patients.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-400">
                No patients found. Add a patient to get started.
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {patients.slice(0, 6).map(p => (
                  <div key={p.patient_id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-blue-700">{p.patient_id.slice(-2)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.patient_id}</p>
                      </div>
                    </div>
                    <Link
                      to={`/patients/${p.patient_id}`}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      View <ChevronRight size={13} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Recent Activity</h3>
              <Link to="/audit" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View all <ChevronRight size={14} />
              </Link>
            </div>
            <div className="px-5 py-4 space-y-0 overflow-y-auto max-h-72">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 rounded" />)}
                </div>
              ) : recentAudit.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No activity yet.</p>
              ) : (
                recentAudit.map(e => <TimelineEvent key={e.audit_id} event={e} />)
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Pending Notifications */}
      {!loading && pending.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Bell size={16} className="text-amber-500" />
              Pending Notifications
            </h3>
            <Link to="/notifications" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {pending.slice(0, 3).map(n => (
              <div key={n.notification_id} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-amber-50/30 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <p className="text-sm font-medium text-slate-900">{n.message}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Patient {n.patient_id} · Triggered {formatTime(n.trigger_time)}
                    · Recipient: <span className="font-medium text-slate-700">{n.clinician_id}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={n.status} />
                  <Link to="/notifications" className="text-xs text-blue-600 hover:underline">Manage</Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
