import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  CheckCircle,
  Clock,
  ExternalLink,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  RotateCw,
  Zap,
  Search,
  X,
  User,
  AlertCircle,
  TrendingUp,
  Activity,
  Send
} from 'lucide-react'
import {
  getNotifications,
  acknowledgeNotification,
  escalateSlaBreaches,
  escalateNotification,
  getClinicians,
  getPatients,
} from '../api'
import { formatTime, formatDateTime } from '../utils'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import StatusBadge, { AvailabilityBadge } from '../components/StatusBadge'
import { SkeletonCard } from '../components/Skeleton'
import ErrorState from '../components/ErrorState'

function NotificationCard({ n, cliniciansMap, patientsMap, onAck, onManualEscalateClick }) {
  const isPending = n.status === 'PENDING'
  const isEscalated = n.status === 'ESCALATED'
  const isEscalationRequired = n.status === 'ESCALATION_REQUIRED'
  const isAcked = n.status === 'ACKNOWLEDGED'

  const patient = patientsMap[n.patient_id] || null
  const origClinician = cliniciansMap[n.original_responsible_clinician_id] || null
  const recipientClinician = cliniciansMap[n.recipient_clinician_id || n.clinician_id] || null

  const isLevelEscalated = n.escalation_level > 0 || isEscalated

  // SLA deadline check
  const now = new Date()
  const deadline = n.ack_deadline ? new Date(n.ack_deadline) : null
  const isSlaBreached = !isAcked && deadline && now > deadline

  return (
    <Card
      className={`overflow-hidden transition-all duration-200 ${
        isEscalationRequired
          ? 'border-rose-300 ring-1 ring-rose-300 bg-rose-50/20'
          : isEscalated
          ? 'border-orange-200 hover:border-orange-300'
          : isPending
          ? 'border-amber-200 hover:border-amber-300'
          : 'border-slate-200'
      }`}
    >
      <div className="p-5">
        {/* Header line */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-lg ${
                isEscalationRequired
                  ? 'bg-rose-100 text-rose-700'
                  : isEscalated
                  ? 'bg-orange-100 text-orange-700'
                  : isPending
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {isEscalationRequired ? (
                <ShieldAlert size={18} />
              ) : (
                <Bell size={18} />
              )}
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">{n.message}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono">
                <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-700">{n.notification_id}</span>
                <span>•</span>
                <span>Result: {n.result_id}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {n.escalation_level > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                Tier {n.escalation_level}
              </span>
            )}
            {isSlaBreached && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                <AlertTriangle size={12} /> SLA Overdue
              </span>
            )}
            <StatusBadge status={n.status} />
          </div>
        </div>

        {/* Warning if ESCALATION_REQUIRED */}
        {isEscalationRequired && (
          <div className="mt-3 p-3 rounded-lg bg-rose-100/80 border border-rose-200 text-rose-900 flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold">Escalation Required: No available backup clinician found.</p>
              <p className="text-rose-700 mt-0.5">
                The primary responsible clinician is unavailable and all backup routing targets are exhausted. Immediate clinical supervisor intervention required.
              </p>
            </div>
          </div>
        )}

        {/* Grid Details */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Patient */}
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-0.5 font-medium">Patient</p>
            <div className="flex items-center justify-between gap-1">
              <div>
                <p className="text-sm font-bold text-slate-900">{patient?.name || n.patient_id}</p>
                <p className="text-xs font-mono text-slate-500">{n.patient_id}</p>
              </div>
              <Link
                to={`/patients/${n.patient_id}`}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                <ExternalLink size={14} />
              </Link>
            </div>
          </div>

          {/* Trigger Time */}
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-0.5 font-medium">Result Trigger Time</p>
            <p className="text-sm font-bold text-slate-800">{formatTime(n.trigger_time)}</p>
            <p className="text-xs text-slate-400">{formatDateTime(n.trigger_time).split('·')[0]}</p>
          </div>

          {/* Historical Responsible Clinician */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-400 mb-0.5 font-medium">Historical Responsible</p>
            <div className="flex items-center justify-between gap-1 mt-0.5">
              <div>
                <span className="text-sm font-bold text-slate-900">
                  {origClinician?.name || n.original_responsible_clinician_id || n.clinician_id}
                </span>
                <span className="block text-xs text-slate-400 font-mono">
                  {n.original_responsible_clinician_id || n.clinician_id}
                </span>
              </div>
              {origClinician && (
                <AvailabilityBadge status={origClinician.availability_status} />
              )}
            </div>
          </div>

          {/* Operational Recipient */}
          <div
            className={`rounded-lg p-3 border ${
              isLevelEscalated
                ? 'bg-orange-50/70 border-orange-200'
                : 'bg-blue-50/70 border-blue-200'
            }`}
          >
            <p className="text-xs text-slate-500 mb-0.5 font-medium">Active Alert Recipient</p>
            <div className="flex items-center justify-between gap-1 mt-0.5">
              <div>
                <span
                  className={`text-sm font-bold ${
                    isLevelEscalated ? 'text-orange-900' : 'text-blue-900'
                  }`}
                >
                  {recipientClinician?.name || n.recipient_clinician_id || n.clinician_id}
                </span>
                <span className="block text-xs font-mono text-slate-500">
                  {n.recipient_clinician_id || n.clinician_id}
                </span>
              </div>
              {recipientClinician && (
                <AvailabilityBadge status={recipientClinician.availability_status} />
              )}
            </div>
          </div>
        </div>

        {/* Escalation details & Explainability */}
        <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Zap size={13} className="text-blue-600" />
              Routing Rationale & Escalation Trail:
            </span>
            {n.ack_deadline && !isAcked && (
              <span
                className={`text-[11px] font-medium flex items-center gap-1 ${
                  isSlaBreached ? 'text-rose-700 font-bold' : 'text-amber-700'
                }`}
              >
                <Clock size={11} />
                SLA Deadline: {formatTime(n.ack_deadline)}
                {isSlaBreached && ' (Breached)'}
              </span>
            )}
            {isAcked && n.acknowledged_at && (
              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle size={12} />
                Acknowledged at {formatTime(n.acknowledged_at)}
              </span>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
            <div>
              <span className="text-slate-400">Responsible Clinician at Trigger: </span>
              <span className="font-semibold text-slate-700">
                {origClinician?.name || n.original_responsible_clinician_id || n.clinician_id}
              </span>{' '}
              {origClinician && (
                <span className="text-slate-500">
                  ({origClinician.availability_status})
                </span>
              )}
            </div>
            <div>
              <span className="text-slate-400">Reason / Path: </span>
              <span className="font-medium text-slate-800">
                {n.escalation_reason || 'Direct delivery (Responsible clinician active)'}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            <Link to={`/patients/${n.patient_id}`}>
              <Button variant="secondary" size="sm" icon={ExternalLink}>
                View Patient Timeline
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {!isAcked && n.escalation_level < 2 && !isEscalationRequired && (
              <Button
                variant="outline"
                size="sm"
                icon={ArrowRight}
                onClick={() => onManualEscalateClick(n)}
              >
                Escalate Tier
              </Button>
            )}
            {!isAcked && (
              <Button
                variant="success"
                size="sm"
                icon={CheckCircle}
                onClick={() => onAck(n.notification_id)}
              >
                Acknowledge Alert
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [cliniciansMap, setCliniciansMap] = useState({})
  const [patientsMap, setPatientsMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [checkingSla, setCheckingSla] = useState(false)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('All')
  const [search, setSearch] = useState('')

  // Toast
  const [toast, setToast] = useState(null)
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4500)
  }

  // Escalation Modal
  const [escalateModal, setEscalateModal] = useState(null)
  const [escalateReason, setEscalateReason] = useState('Primary clinician unreachable')
  const [escalating, setEscalating] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const [nRes, cRes, pRes] = await Promise.all([
        getNotifications(),
        getClinicians().catch(() => ({ data: [] })),
        getPatients().catch(() => ({ data: [] })),
      ])
      setNotifications(nRes.data || [])

      const cMap = {}
      ;(cRes.data || []).forEach((c) => {
        cMap[c.clinician_id] = c
      })
      setCliniciansMap(cMap)

      const pMap = {}
      ;(pRes.data || []).forEach((p) => {
        pMap[p.patient_id] = p
      })
      setPatientsMap(pMap)
    } catch {
      setError('Unable to load notifications.')
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
      showToast(`Notification ${id} acknowledged successfully.`)
      load()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to acknowledge.', 'error')
    }
  }

  const handleManualEscalate = async (e) => {
    e.preventDefault()
    if (!escalateModal) return
    try {
      setEscalating(true)
      await escalateNotification(escalateModal.notification_id, escalateReason)
      setEscalateModal(null)
      showToast(`Notification ${escalateModal.notification_id} escalated to next tier.`)
      load()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to escalate.', 'error')
    } finally {
      setEscalating(false)
    }
  }

  const handleCheckSla = async () => {
    try {
      setCheckingSla(true)
      const res = await escalateSlaBreaches()
      const escalatedCount = res.data?.length || 0
      load()
      if (escalatedCount > 0) {
        showToast(`SLA Scan Complete: ${escalatedCount} notification(s) escalated to backup tiers.`, 'success')
      } else {
        showToast('SLA Scan Complete: All pending notifications within active SLA deadlines.', 'success')
      }
    } catch (err) {
      showToast(err?.response?.data?.detail || 'SLA scan failed.', 'error')
    } finally {
      setCheckingSla(false)
    }
  }

  const tabs = ['All', 'Pending', 'Escalated', 'Escalation Required', 'Acknowledged']

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      // Tab filter
      if (tab === 'Pending' && n.status !== 'PENDING') return false
      if (tab === 'Escalated' && n.status !== 'ESCALATED') return false
      if (tab === 'Escalation Required' && n.status !== 'ESCALATION_REQUIRED') return false
      if (tab === 'Acknowledged' && n.status !== 'ACKNOWLEDGED') return false

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase()
        const pName = patientsMap[n.patient_id]?.name?.toLowerCase() || ''
        const origName = cliniciansMap[n.original_responsible_clinician_id]?.name?.toLowerCase() || ''
        const recName = cliniciansMap[n.recipient_clinician_id || n.clinician_id]?.name?.toLowerCase() || ''
        const matchesId = n.notification_id?.toLowerCase().includes(q)
        const matchesResult = n.result_id?.toLowerCase().includes(q)
        const matchesPatient = n.patient_id?.toLowerCase().includes(q) || pName.includes(q)
        const matchesClinician =
          n.clinician_id?.toLowerCase().includes(q) || origName.includes(q) || recName.includes(q)
        const matchesMsg = n.message?.toLowerCase().includes(q)
        return matchesId || matchesResult || matchesPatient || matchesClinician || matchesMsg
      }
      return true
    })
  }, [notifications, tab, search, patientsMap, cliniciansMap])

  const pendingCount = notifications.filter((n) => n.status === 'PENDING').length
  const escalatedCount = notifications.filter((n) => n.status === 'ESCALATED').length
  const reqCount = notifications.filter((n) => n.status === 'ESCALATION_REQUIRED').length
  const ackedCount = notifications.filter((n) => n.status === 'ACKNOWLEDGED').length

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg border text-sm animate-fade-in ${
            toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
          ) : (
            <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
          )}
          <span className="font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header with scan button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinical Notifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Responsibility-aware alert routing with automatic backup clinician escalation and acknowledgment SLAs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={RotateCw}
            disabled={checkingSla}
            onClick={handleCheckSla}
          >
            {checkingSla ? 'Scanning SLAs...' : 'Scan SLA Breaches'}
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Alerts
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{pendingCount}</p>
          <span className="text-xs text-slate-400">Awaiting acknowledgment</span>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Escalated Tiers
            </span>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-orange-600 mt-2">{escalatedCount}</p>
          <span className="text-xs text-slate-400">Routed to backup clinicians</span>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Supervisor Attention
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <ShieldAlert size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">{reqCount}</p>
          <span className="text-xs text-rose-600 font-medium">Backup targets exhausted</span>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Acknowledged
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{ackedCount}</p>
          <span className="text-xs text-slate-400">Confirmed by clinicians</span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white placeholder:text-slate-400"
              placeholder="Search notifications by patient, clinician, result ID, or message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  tab === t
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t}
                {t === 'Pending' && pendingCount > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    tab === t ? 'bg-white text-blue-700' : 'bg-amber-200 text-amber-900'
                  }`}>
                    {pendingCount}
                  </span>
                )}
                {t === 'Escalated' && escalatedCount > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    tab === t ? 'bg-white text-blue-700' : 'bg-orange-200 text-orange-900'
                  }`}>
                    {escalatedCount}
                  </span>
                )}
                {t === 'Escalation Required' && reqCount > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    tab === t ? 'bg-white text-blue-700' : 'bg-rose-200 text-rose-900'
                  }`}>
                    {reqCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <SkeletonCard key={i} rows={4} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <Card className="p-16 text-center">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Bell size={36} className="opacity-30" />
            <p className="text-base font-semibold text-slate-700">No {tab.toLowerCase()} notifications</p>
            <p className="text-xs text-slate-500 max-w-sm">
              No clinical notifications currently match this filter. When results arrive from laboratory or diagnostic imaging, alerts appear here.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((n) => (
            <NotificationCard
              key={n.notification_id}
              n={n}
              cliniciansMap={cliniciansMap}
              patientsMap={patientsMap}
              onAck={handleAck}
              onManualEscalateClick={(notif) => {
                setEscalateModal(notif)
                setEscalateReason('Primary clinician unreachable')
              }}
            />
          ))}
        </div>
      )}

      {/* Manual Escalation Modal */}
      {escalateModal && (
        <Modal
          title={`Manual Tier Escalation: ${escalateModal.notification_id}`}
          onClose={() => setEscalateModal(null)}
          size="md"
        >
          <form onSubmit={handleManualEscalate} className="space-y-4">
            <p className="text-xs text-slate-600">
              Escalate this notification to the next clinician in the designated backup chain (Current Tier: {escalateModal.escalation_level}).
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Escalation Reason
              </label>
              <select
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
              >
                <option value="Primary clinician unreachable">Primary clinician unreachable</option>
                <option value="Shift handoff in progress">Shift handoff in progress</option>
                <option value="Critical patient deterioration">Critical patient deterioration</option>
                <option value="Supervisor emergency override">Supervisor emergency override</option>
                <option value="Manual clinician delegation">Manual clinician delegation</option>
              </select>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                This escalation will immediately update the active recipient and record an immutable audit log entry.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setEscalateModal(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={escalating}>
                {escalating ? 'Escalating…' : 'Confirm Escalation'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
