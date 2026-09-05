import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCircle, Clock, ExternalLink } from 'lucide-react'
import { getNotifications, acknowledgeNotification } from '../api'
import { formatTime, formatDateTime } from '../utils'
import Card from '../components/Card'
import Button from '../components/Button'
import StatusBadge from '../components/StatusBadge'
import { SkeletonCard } from '../components/Skeleton'
import ErrorState from '../components/ErrorState'

function NotificationCard({ n, onAck }) {
  const isPending = n.status === 'PENDING'
  return (
    <Card className={`overflow-hidden transition-all duration-200 ${
      isPending ? 'border-amber-200 hover:border-amber-300' : ''
    }`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${isPending ? 'bg-amber-100' : 'bg-emerald-100'}`}>
              <Bell size={18} className={isPending ? 'text-amber-600' : 'text-emerald-600'} />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{n.message}</p>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">{n.notification_id}</p>
            </div>
          </div>
          <StatusBadge status={n.status} />
        </div>

        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-0.5">Patient</p>
            <p className="text-sm font-semibold text-slate-800">{n.patient_id}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-0.5">Trigger Time</p>
            <p className="text-sm font-semibold text-slate-800">{formatTime(n.trigger_time)}</p>
          </div>
          <div className={`rounded-lg p-3 ${isPending ? 'bg-blue-50 border border-blue-100' : 'bg-slate-50'}`}>
            <p className="text-xs text-slate-400 mb-0.5">Responsible Clinician</p>
            <p className={`text-sm font-bold ${isPending ? 'text-blue-700' : 'text-slate-800'}`}>{n.clinician_id}</p>
          </div>
        </div>

        {/* Why was I notified mini-section */}
        <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-xs font-semibold text-slate-600 mb-2">Why was {n.clinician_id} notified?</p>
          <div className="space-y-1">
            {['Standing request matched', 'Responsibility timeline reconstructed', `Responsible at ${formatTime(n.trigger_time)}`].map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />
                {s}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <Link to={`/patients/${n.patient_id}`}>
            <Button variant="secondary" size="sm" icon={ExternalLink}>View Patient</Button>
          </Link>
          {isPending && (
            <Button variant="success" size="sm" icon={CheckCircle} onClick={() => onAck(n.notification_id)}>
              Acknowledge
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('All')

  const load = async () => {
    try {
      setLoading(true); setError(null)
      const res = await getNotifications()
      setNotifications(res.data)
    } catch { setError('Unable to load notifications.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleAck = async (id) => {
    try {
      await acknowledgeNotification(id)
      load()
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to acknowledge.')
    }
  }

  const tabs = ['All', 'Pending', 'Acknowledged']
  const filtered = notifications.filter(n =>
    tab === 'All' ? true :
    tab === 'Pending' ? n.status === 'PENDING' :
    n.status === 'ACKNOWLEDGED'
  )

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
            {t === 'Pending' && notifications.filter(n => n.status === 'PENDING').length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                {notifications.filter(n => n.status === 'PENDING').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} rows={4} />)}
        </div>
      ) : error ? <ErrorState message={error} onRetry={load} /> :
      filtered.length === 0 ? (
        <Card className="p-16 text-center">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Bell size={32} className="opacity-30" />
            <p className="text-sm font-medium">No {tab.toLowerCase()} notifications</p>
            <p className="text-xs">You're all caught up. No pending clinical notifications require your attention.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map(n => (
            <NotificationCard key={n.notification_id} n={n} onAck={handleAck} />
          ))}
        </div>
      )}
    </div>
  )
}
