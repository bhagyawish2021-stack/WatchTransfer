import { useEffect, useState } from 'react'
import {
  FileClock,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Clock,
  Calendar,
  User,
  Database,
  RefreshCw,
} from 'lucide-react'
import { getAuditLogs, getPatients, getClinicians } from '../api'
import { formatDateTime, formatTime } from '../utils'
import Card from '../components/Card'
import Button from '../components/Button'
import { SkeletonTable } from '../components/Skeleton'
import ErrorState from '../components/ErrorState'

const eventTypeStyles = {
  REQUEST_CREATED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  HANDOFF_RECEIVED: 'bg-amber-50 text-amber-700 border-amber-200',
  RESULT_RECEIVED: 'bg-purple-50 text-purple-700 border-purple-200',
  RESPONSIBILITY_RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  NOTIFICATION_CREATED: 'bg-blue-50 text-blue-700 border-blue-200',
  NOTIFICATION_ACKNOWLEDGED: 'bg-teal-50 text-teal-700 border-teal-200',
}

export default function Audit() {
  const [logs, setLogs] = useState([])
  const [patients, setPatients] = useState([])
  const [clinicians, setClinicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  // Filters
  const [selectedPatient, setSelectedPatient] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedClinician, setSelectedClinician] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchAuditData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [logsRes, patientsRes, cliniciansRes] = await Promise.all([
        getAuditLogs(),
        getPatients().catch(() => ({ data: [] })),
        getClinicians().catch(() => ({ data: [] })),
      ])
      // Display newest records first
      const sorted = (logsRes.data || []).sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )
      setLogs(sorted)
      setPatients(patientsRes.data || [])
      setClinicians(cliniciansRes.data || [])
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditData()
  }, [])

  const filteredLogs = logs.filter((item) => {
    if (selectedPatient && item.patient_id !== selectedPatient) return false
    if (selectedType && item.event_type !== selectedType) return false
    if (selectedClinician && item.clinician_id !== selectedClinician) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchDesc = item.description?.toLowerCase().includes(q)
      const matchId = item.audit_id?.toLowerCase().includes(q)
      const matchEntity = item.entity_id?.toLowerCase().includes(q)
      if (!matchDesc && !matchId && !matchEntity) return false
    }
    return true
  })

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <ShieldCheck size={16} className="text-blue-600" />
            <span>Immutable Regulatory Record</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Trail</h1>
          <p className="text-sm text-slate-500">
            Complete traceability of system decisions, responsibility changes, and notification triggers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={fetchAuditData}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search description, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 focus:bg-white transition"
            />
          </div>

          {/* Event Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 focus:bg-white transition text-slate-700"
            >
              <option value="">All Event Types</option>
              <option value="REQUEST_CREATED">REQUEST_CREATED</option>
              <option value="HANDOFF_RECEIVED">HANDOFF_RECEIVED</option>
              <option value="RESULT_RECEIVED">RESULT_RECEIVED</option>
              <option value="RESPONSIBILITY_RESOLVED">RESPONSIBILITY_RESOLVED</option>
              <option value="NOTIFICATION_CREATED">NOTIFICATION_CREATED</option>
              <option value="NOTIFICATION_ACKNOWLEDGED">NOTIFICATION_ACKNOWLEDGED</option>
            </select>
          </div>

          {/* Patient Filter */}
          <div>
            <select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 focus:bg-white transition text-slate-700"
            >
              <option value="">All Patients</option>
              {patients.map((p) => (
                <option key={p.patient_id} value={p.patient_id}>
                  {p.patient_id} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Clinician Filter */}
          <div>
            <select
              value={selectedClinician}
              onChange={(e) => setSelectedClinician(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 focus:bg-white transition text-slate-700"
            >
              <option value="">All Clinicians</option>
              {clinicians.map((c) => (
                <option key={c.clinician_id} value={c.clinician_id}>
                  {c.clinician_id} - {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter stats summary */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-700">{filteredLogs.length}</strong> of{' '}
            <strong className="text-slate-700">{logs.length}</strong> audit records
          </span>
          {(selectedPatient || selectedType || selectedClinician || searchQuery) && (
            <button
              onClick={() => {
                setSelectedPatient('')
                setSelectedType('')
                setSelectedClinician('')
                setSearchQuery('')
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <SkeletonTable rows={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchAuditData} />
      ) : filteredLogs.length === 0 ? (
        <Card className="py-16 text-center">
          <FileClock className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No audit records found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
            {logs.length === 0
              ? 'As events occur in the system, each action will be logged here immutably.'
              : 'Try adjusting your filters or search query.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isExpanded = expandedId === log.audit_id
            const pillStyle =
              eventTypeStyles[log.event_type] ||
              'bg-slate-100 text-slate-700 border-slate-200'

            return (
              <Card
                key={log.audit_id}
                className={`transition-all duration-150 border ${
                  isExpanded ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div
                  onClick={() => toggleExpand(log.audit_id)}
                  className="p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 select-none"
                >
                  <div className="flex items-start gap-3">
                    <button
                      className="mt-0.5 text-slate-400 hover:text-slate-600 transition"
                      aria-label="Toggle details"
                    >
                      {isExpanded ? (
                        <ChevronDown size={18} className="text-blue-600" />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </button>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${pillStyle}`}
                        >
                          ✓ {log.event_type}
                        </span>
                        {log.patient_id && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            Patient: <span className="font-semibold">{log.patient_id}</span>
                          </span>
                        )}
                        {log.clinician_id && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            Clinician: <span className="font-semibold">{log.clinician_id}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-800">
                        {log.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 self-end md:self-center pl-8 md:pl-0">
                    <div className="text-right">
                      <div className="font-mono text-slate-700">
                        {log.event_time ? formatDateTime(log.event_time) : formatDateTime(log.created_at)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Recorded: {formatTime(log.created_at)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Detail Panel */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-5 rounded-b-xl space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Audit ID</span>
                        <span className="font-mono font-medium text-slate-700">
                          {log.audit_id}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Entity / Type</span>
                        <span className="font-medium text-slate-700">
                          {log.entity_type || 'N/A'}{' '}
                          {log.entity_id && (
                            <span className="font-mono text-blue-600 font-semibold">
                              ({log.entity_id})
                            </span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Event Timestamp</span>
                        <span className="font-mono text-slate-700">
                          {log.event_time ? formatDateTime(log.event_time) : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">System Recorded At</span>
                        <span className="font-mono text-slate-700">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Metadata view */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                          <Database size={13} className="text-slate-400" />
                          <span>Event Metadata & Decision Parameters</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {Object.entries(log.metadata).map(([key, val]) => (
                            <div
                              key={key}
                              className="text-xs bg-slate-50 p-2 rounded border border-slate-100 flex flex-col justify-between"
                            >
                              <span className="text-slate-500 font-medium capitalize">
                                {key.replace(/_/g, ' ')}
                              </span>
                              <span className="font-mono text-slate-900 font-semibold mt-0.5 break-all">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </span>
                            </div>
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
      )}
    </div>
  )
}
