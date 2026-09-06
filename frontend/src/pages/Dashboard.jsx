import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  ClipboardList,
  Bell,
  FileClock,
  CheckCircle,
  Clock,
  ChevronRight,
  Activity,
  ArrowUpRight,
  AlertTriangle,
  ShieldAlert,
  Send,
  UserCheck,
} from 'lucide-react'
import {
  getPatients,
  getRequests,
  getNotifications,
  getAuditLogs,
  getClinicians,
  acknowledgeNotification,
} from '../api'
import { formatTime, eventTypeColor } from '../utils'
import Card from '../components/Card'
import StatusBadge, { AvailabilityBadge } from '../components/StatusBadge'
import Button from '../components/Button'
import { SkeletonCard } from '../components/Skeleton'
import ErrorState from '../components/ErrorState'

function KpiCard({ icon: Icon, label, value, sub, color, alertMode = false }) {
  return (
    <Card className={`p-5 transition-all ${alertMode ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/20' : ''}`}>
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        {alertMode && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
            Action Needed
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${alertMode ? 'text-rose-700' : 'text-slate-900'}`}>
          {value}
        </p>
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
        <span
          className={`w-2.5 h-2.5 rounded-full border-2 ${
            event.event_type === 'RESPONSIBILITY_RESOLVED'
              ? 'bg-emerald-500 border-emerald-300'
              : event.event_type.includes('ESCALAT')
              ? 'bg-orange-500 border-orange-300'
              : event.event_type.includes('HANDOFF')
              ? 'bg-amber-400 border-amber-200'
              : 'bg-blue-500 border-blue-200'
          } flex-shrink-0 mt-1`}
        />
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
  const [clinicians, setClinicians] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const [p, r, n, a, c] = await Promise.allSettled([
        getPatients(),
        getRequests(),
        getNotifications(),
        getAuditLogs(),
        getClinicians(),
      ])

      if (p.status === 'fulfilled') setPatients(p.value.data || [])
      if (r.status === 'fulfilled') setRequests(r.value.data || [])
      if (n.status === 'fulfilled') setNotifications(n.value.data || [])
      if (a.status === 'fulfilled') setAuditLogs(a.value.data || [])
      if (c.status === 'fulfilled') setClinicians(c.value.data || [])

      if (p.status === 'rejected' && r.status === 'rejected' && n.status === 'rejected') {
        const msg =
          p.reason?.response?.data?.detail ||
          p.reason?.message ||
          'Unable to connect to backend service.'
        setError(`Unable to load dashboard data: ${msg}`)
      }
    } catch (err) {
      setError(
        err?.response?.data?.detail || err?.message || 'Unable to load dashboard data.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleAck = async (id) => {
    try {
      await acknowledgeNotification(id)
      load()
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to acknowledge notification.')
    }
  }

  // Calculate required KPIs
  const totalNotifications = notifications.length
  const directNotifications = notifications.filter(
    (n) => n.escalation_level === 0 && n.status !== 'ESCALATED' && n.status !== 'ESCALATION_REQUIRED'
  ).length
  const escalatedNotifications = notifications.filter(
    (n) => n.escalation_level > 0 || n.status === 'ESCALATED'
  ).length
  const escalationRate =
    totalNotifications > 0
      ? Math.round((escalatedNotifications / totalNotifications) * 100)
      : 0
  const pendingAcks = notifications.filter(
    (n) => n.status === 'PENDING' || n.status === 'ESCALATED'
  ).length
  const escalationRequiredCount = notifications.filter(
    (n) => n.status === 'ESCALATION_REQUIRED'
  ).length

  const recentAudit = [...auditLogs].reverse().slice(0, 8)
  const pendingAlerts = notifications.filter(
    (n) => n.status === 'PENDING' || n.status === 'ESCALATED' || n.status === 'ESCALATION_REQUIRED'
  )

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {greeting}, Clinical Command Center
          </h2>
          <p className="text-slate-500 mt-1 text-sm">
            Responsibility timeline tracking, active clinician availability, and SLA escalation oversight.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {escalationRequiredCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-200 animate-pulse">
              <AlertTriangle size={14} />
              {escalationRequiredCount} Action Required
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            WatchTransfer Online
          </span>
        </div>
      </div>

      {/* KPI Cards (All Requested Metrics) */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} rows={2} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard
            icon={Bell}
            label="Total Notifications"
            value={totalNotifications}
            color="bg-blue-600"
            sub="All clinical alerts"
          />
          <KpiCard
            icon={Send}
            label="Direct Notifications"
            value={directNotifications}
            color="bg-emerald-600"
            sub="Level 0 directly delivered"
          />
          <KpiCard
            icon={ArrowUpRight}
            label="Escalated Alerts"
            value={escalatedNotifications}
            color="bg-orange-500"
            sub="Rerouted to backup"
          />
          <KpiCard
            icon={Activity}
            label="Escalation Rate"
            value={`${escalationRate}%`}
            color="bg-purple-600"
            sub="Rerouted / Total"
          />
          <KpiCard
            icon={Clock}
            label="Pending Acks"
            value={pendingAcks}
            color="bg-amber-500"
            sub="Awaiting clinician ack"
          />
          <KpiCard
            icon={ShieldAlert}
            label="SLA Breaches / Req"
            value={escalationRequiredCount}
            color="bg-rose-600"
            alertMode={escalationRequiredCount > 0}
            sub="Unresolved / No backup"
          />
        </div>
      )}

      {/* Clinician Availability Quick Strip */}
      {!loading && clinicians.length > 0 && (
        <Card className="p-4 bg-slate-50/60 border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-slate-600" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Clinician Availability Status
              </h3>
            </div>
            <Link
              to="/settings"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Update Availability <ChevronRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {clinicians.map((c) => (
              <div
                key={c.clinician_id}
                className="bg-white rounded-lg p-2.5 border border-slate-200/80 flex items-center justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">{c.name}</span>
                    <span className="text-[10px] text-slate-400">({c.clinician_id})</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{c.role}</p>
                </div>
                <AvailabilityBadge status={c.availability_status} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Active Attention Stream */}
        <div className="lg:col-span-3">
          <Card>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Bell size={16} className="text-amber-500" />
                Active Attention Stream
                {pendingAlerts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    {pendingAlerts.length}
                  </span>
                )}
              </h3>
              <Link
                to="/notifications"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                View all notifications <ChevronRight size={14} />
              </Link>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <SkeletonCard key={i} rows={1} />
                ))}
              </div>
            ) : pendingAlerts.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-400">
                <CheckCircle size={32} className="mx-auto text-emerald-400 mb-2 opacity-80" />
                All clear! No pending clinical alerts requiring acknowledgment.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingAlerts.slice(0, 5).map((n) => (
                  <div
                    key={n.notification_id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={n.status} />
                        {n.escalation_level > 0 && (
                          <span className="text-[11px] font-semibold px-1.5 py-0.2 bg-orange-100 text-orange-800 rounded">
                            Tier {n.escalation_level}
                          </span>
                        )}
                        <p className="text-sm font-semibold text-slate-900">{n.message}</p>
                      </div>
                      <p className="text-xs text-slate-500">
                        Patient <span className="font-semibold text-slate-700">{n.patient_id}</span> · Triggered{' '}
                        {formatTime(n.trigger_time)} · Recipient:{' '}
                        <span className="font-bold text-blue-700">
                          {n.recipient_clinician_id || n.clinician_id}
                        </span>
                        {n.original_responsible_clinician_id &&
                          n.original_responsible_clinician_id !== (n.recipient_clinician_id || n.clinician_id) && (
                            <span className="text-slate-400">
                              {' '}
                              (Original: {n.original_responsible_clinician_id})
                            </span>
                          )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleAck(n.notification_id)}
                      >
                        Acknowledge
                      </Button>
                      <Link to="/notifications">
                        <Button variant="outline" size="sm">
                          Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Recent Activity Audit Trail */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Recent Audit Events</h3>
              <Link
                to="/audit"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                View full audit <ChevronRight size={14} />
              </Link>
            </div>
            <div className="px-5 py-4 space-y-0 overflow-y-auto max-h-80">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="skeleton h-10 rounded" />
                  ))}
                </div>
              ) : recentAudit.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No activity yet.</p>
              ) : (
                recentAudit.map((e) => <TimelineEvent key={e.audit_id} event={e} />)
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

