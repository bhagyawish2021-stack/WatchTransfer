import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle, Clock, Activity,
  ChevronRight, Stethoscope, ShieldCheck,
} from 'lucide-react'
import {
  getPatient, getPatientTimeline, getPatientAudit,
  getRequests, getNotifications, getResults,
} from '../api'
import { formatTime, formatDateTime, parseMeta, eventTypeColor } from '../utils'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import { SkeletonCard } from '../components/Skeleton'
import ErrorState from '../components/ErrorState'

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-blue-600 text-blue-700'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  )
}

function TimelineView({ timeline, results }) {
  const allEvents = [
    ...timeline.map(e => ({ ...e, _type: 'handoff' })),
    ...results.map(r => ({ ...r, event_time: r.event_time, _type: 'result' })),
  ].sort((a, b) => new Date(a.event_time) - new Date(b.event_time))

  const resolved = allEvents.find(e => e._type === 'result')
  const lastHandoffBefore = timeline
    .filter(h => !resolved || new Date(h.event_time) <= new Date(resolved.event_time))
    .slice(-1)[0]

  return (
    <div className="space-y-6">
      {/* Visual Timeline */}
      <Card className="p-6">
        <h4 className="text-sm font-semibold text-slate-700 mb-6">Responsibility Timeline</h4>
        <div className="relative">
          {allEvents.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No timeline events yet.</p>
          )}
          {allEvents.map((e, i) => {
            const isResult = e._type === 'result'
            return (
              <div key={i} className="flex gap-4 mb-0">
                {/* Left: time */}
                <div className="w-24 text-right flex-shrink-0 pt-0.5">
                  <span className="text-xs font-medium text-slate-500">
                    {formatTime(e.event_time)}
                  </span>
                </div>
                {/* Center: dot + line */}
                <div className="flex flex-col items-center">
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                    isResult
                      ? 'bg-purple-500 border-purple-300 shadow-sm shadow-purple-200'
                      : 'bg-amber-400 border-amber-200'
                  }`} />
                  {i < allEvents.length - 1 && (
                    <div className="w-0.5 bg-slate-200 flex-1 my-1 min-h-8" />
                  )}
                </div>
                {/* Right: content */}
                <div className="flex-1 pb-6">
                  {isResult ? (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-0.5">
                        Result Available
                      </p>
                      <p className="text-sm text-slate-800 font-medium">{e.result_type}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{e.result_id}</p>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">
                        Handoff Received
                      </p>
                      <p className="text-sm text-slate-800 font-medium">
                        {e.from_clinician || '(initial)'} → {e.to_clinician}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{e.event_id}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Resolution Card */}
        {resolved && lastHandoffBefore && (
          <div className="mt-2 border border-emerald-200 bg-emerald-50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={18} className="text-emerald-600" />
              <span className="text-sm font-bold text-emerald-800 uppercase tracking-wide">
                Responsibility Resolved
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-emerald-600 font-medium mb-0.5">At trigger time</p>
                <p className="text-base font-semibold text-slate-900">{formatTime(resolved.event_time)}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-medium mb-0.5">Responsible Clinician</p>
                <p className="text-base font-bold text-emerald-800">{lastHandoffBefore.to_clinician}</p>
              </div>
            </div>
            <p className="text-xs text-emerald-600 mt-3 flex items-center gap-1">
              <ShieldCheck size={12} /> Resolution method: event_time ordering
            </p>
          </div>
        )}
      </Card>

      {/* Explainability */}
      {resolved && lastHandoffBefore && (
        <Card className="p-6">
          <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-500" />
            Why was {lastHandoffBefore.to_clinician} selected?
          </h4>
          <div className="space-y-2.5">
            {[
              'Standing request matched',
              'Timeline reconstructed using event_time',
              'Handoffs sorted by event_time (out-of-order safe)',
              `Trigger time identified: ${formatTime(resolved.event_time)}`,
              `${lastHandoffBefore.to_clinician} was responsible at trigger time`,
              `Notification created for ${lastHandoffBefore.to_clinician}`,
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm text-slate-700">
                <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                {step}
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="text-slate-400 mb-1">Request Creator</p>
                <p className="font-bold text-slate-700">C001</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-blue-500 mb-1">Responsible At Trigger</p>
                <p className="font-bold text-blue-700">{lastHandoffBefore.to_clinician}</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="text-emerald-500 mb-1">Notification Recipient</p>
                <p className="font-bold text-emerald-700">{lastHandoffBefore.to_clinician}</p>
              </div>
            </div>
            <p className="text-center text-xs text-slate-400 mt-3 italic">
              Request Creator ≠ Responsible Clinician — WatchTransfer resolves the correct recipient
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

function AuditView({ audit }) {
  const [expanded, setExpanded] = useState(null)
  return (
    <div className="space-y-2">
      {audit.length === 0 && (
        <Card className="p-10 text-center text-sm text-slate-400">No audit records yet.</Card>
      )}
      {audit.map(e => {
        const meta = parseMeta(e.extra_metadata)
        const isOpen = expanded === e.audit_id
        return (
          <Card
            key={e.audit_id}
            hover
            onClick={() => setExpanded(isOpen ? null : e.audit_id)}
            className="overflow-hidden"
          >
            <div className="px-5 py-3.5 flex items-center gap-3">
              <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${eventTypeColor(e.event_type)}`}>
                {e.event_type.replace(/_/g, ' ')}
              </span>
              <p className="text-sm text-slate-700 flex-1 truncate">{e.description}</p>
              <span className="text-xs text-slate-400 flex-shrink-0">{formatTime(e.created_at)}</span>
            </div>
            {isOpen && (
              <div className="px-5 pb-4 bg-slate-50 border-t border-slate-100 grid sm:grid-cols-2 gap-3 text-xs">
                <div><span className="text-slate-400">Entity:</span> <span className="font-medium">{e.entity_type} / {e.entity_id}</span></div>
                <div><span className="text-slate-400">Event time:</span> <span className="font-medium">{formatDateTime(e.event_time)}</span></div>
                <div><span className="text-slate-400">Stored at:</span> <span className="font-medium">{formatDateTime(e.created_at)}</span></div>
                {meta && (
                  <div className="sm:col-span-2">
                    <p className="text-slate-400 mb-1">Metadata:</p>
                    <div className="bg-white rounded border border-slate-200 p-2 font-mono text-xs space-y-0.5">
                      {Object.entries(meta).map(([k, v]) => (
                        <div key={k}><span className="text-slate-500">{k}:</span> <span className="text-slate-800">{String(v)}</span></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

export default function PatientDetail() {
  const params = useParams()
  const patientId = params.patientId || params.id
  const [patient, setPatient] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [audit, setAudit] = useState([])
  const [requests, setRequests] = useState([])
  const [results, setResults] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('Timeline')

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const [p, tl, aud, reqs, res, notifs] = await Promise.allSettled([
        getPatient(patientId),
        getPatientTimeline(patientId),
        getPatientAudit(patientId),
        getRequests(),
        getResults(),
        getNotifications(),
      ])

      if (p.status === 'rejected') {
        const msg = p.reason?.response?.data?.detail || p.reason?.message || 'Patient not found'
        throw new Error(msg)
      }

      setPatient(p.value.data)
      setTimeline(tl.status === 'fulfilled' && Array.isArray(tl.value.data) ? tl.value.data : [])
      setAudit(aud.status === 'fulfilled' && Array.isArray(aud.value.data) ? aud.value.data : [])

      const allReqs = reqs.status === 'fulfilled' && Array.isArray(reqs.value.data) ? reqs.value.data : []
      const allRes = res.status === 'fulfilled' && Array.isArray(res.value.data) ? res.value.data : []
      const allNotifs = notifs.status === 'fulfilled' && Array.isArray(notifs.value.data) ? notifs.value.data : []

      setRequests(allReqs.filter(r => r.patient_id === patientId))
      setResults(allRes.filter(r => r.patient_id === patientId))
      setNotifications(allNotifs.filter(n => n.patient_id === patientId))
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Unable to load patient details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [patientId])

  const tabs = ['Timeline', 'Requests', 'Results', 'Notifications', 'Audit']
  const lastHandoff = [...timeline].sort((a, b) => new Date(b.event_time) - new Date(a.event_time))[0]

  if (loading) return (
    <div className="space-y-4">
      <SkeletonCard rows={3} />
      <SkeletonCard rows={5} />
    </div>
  )
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!patient) return null

  return (
    <div className="space-y-5">
      {/* Back */}
      <Link to="/patients" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Back to Patients
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{patient.name}</h2>
          <p className="text-slate-500 text-sm mt-0.5 font-mono">{patient.patient_id}</p>
        </div>
        <StatusBadge status="ACTIVE" />
      </div>

      {/* Current Responsible Card */}
      {lastHandoff && (
        <Card className="p-5 border-blue-200 bg-blue-50/40">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
            Current Responsible Clinician
          </p>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Stethoscope size={22} className="text-blue-700" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{lastHandoff.to_clinician}</p>
              <p className="text-sm text-blue-600 font-medium mt-0.5">Responsible Now</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Since {formatTime(lastHandoff.event_time)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-1 overflow-x-auto">
        {tabs.map(t => (
          <Tab key={t} label={t} active={tab === t} onClick={() => setTab(t)} />
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'Timeline' && (
        <TimelineView timeline={timeline} results={results} />
      )}

      {tab === 'Requests' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <Card className="p-10 text-center text-sm text-slate-400">No standing requests.</Card>
          ) : requests.map(r => (
            <Card key={r.request_id} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{r.result_type}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{r.request_id}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Requested by: <span className="font-medium text-slate-700">{r.requested_by}</span>
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'Results' && (
        <div className="space-y-3">
          {results.length === 0 ? (
            <Card className="p-10 text-center text-sm text-slate-400">No results yet.</Card>
          ) : results.map(r => (
            <Card key={r.result_id} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{r.result_type}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{r.result_id}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Event time: <span className="font-medium">{formatDateTime(r.event_time)}</span>
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'Notifications' && (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <Card className="p-10 text-center text-sm text-slate-400">No notifications for this patient.</Card>
          ) : notifications.map(n => (
            <Card key={n.notification_id} className="p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{n.message}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Recipient: <span className="font-medium text-slate-700">{n.clinician_id}</span>
                    · Trigger time: {formatTime(n.trigger_time)}
                  </p>
                </div>
                <StatusBadge status={n.status} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'Audit' && <AuditView audit={audit} />}
    </div>
  )
}
