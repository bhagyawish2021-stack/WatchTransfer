import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  ClipboardList,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  Play,
  Pause,
  Trash2,
  Sparkles,
  ExternalLink,
  Activity,
  User,
  X,
  FileText
} from 'lucide-react'
import {
  getRequests,
  createRequest,
  updateRequestStatus,
  deleteRequest,
  getPatients,
  getClinicians
} from '../api'
import { formatDateTime } from '../utils'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import SkeletonTable from '../components/Skeleton'
import ErrorState from '../components/ErrorState'

const RESULT_TYPES = [
  'Blood Test',
  'Blood Chemistry',
  'Troponin I',
  'ECG',
  'X-Ray',
  'MRI',
  'CT Scan',
  'Ultrasound',
  'Biopsy',
  'Urine Test',
  'Complete Blood Count (CBC)'
]

const CONDITION_PRESETS = [
  'When available',
  'Critical abnormal values (Panic criteria)',
  'Troponin I > 0.04 ng/mL',
  'Potassium < 3.5 or > 5.2 mEq/L',
  'Platelets < 50,000 /uL or > 450,000 /uL',
  'Acute findings requiring immediate intervention'
]

export default function Requests() {
  const [requests, setRequests] = useState([])
  const [patients, setPatients] = useState([])
  const [clinicians, setClinicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Search & Filter
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')

  // Modal & Form
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState(null)

  const [form, setForm] = useState({
    request_id: '',
    patient_id: '',
    requested_by: '',
    result_type: 'Blood Test',
    condition: 'When available',
    status: 'ACTIVE',
  })

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const [r, p, c] = await Promise.all([
        getRequests(),
        getPatients().catch(() => ({ data: [] })),
        getClinicians().catch(() => ({ data: [] }))
      ])
      setRequests(r.data || [])
      setPatients(p.data || [])
      setClinicians(c.data || [])
    } catch {
      setError('Unable to load standing requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Maps for quick lookup
  const patientsMap = useMemo(() => {
    const map = {}
    patients.forEach((p) => { map[p.patient_id] = p })
    return map
  }, [patients])

  const cliniciansMap = useMemo(() => {
    const map = {}
    clinicians.forEach((c) => { map[c.clinician_id] = c })
    return map
  }, [clinicians])

  const handleOpenModal = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    setForm({
      request_id: `REQ-${randomSuffix}`,
      patient_id: patients[0]?.patient_id || '',
      requested_by: clinicians[0]?.clinician_id || '',
      result_type: 'Blood Test',
      condition: 'When available',
      status: 'ACTIVE',
    })
    setFormError('')
    setShowModal(true)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.request_id.trim() || !form.patient_id || !form.requested_by || !form.condition.trim()) {
      setFormError('All fields are required.')
      return
    }
    try {
      setSaving(true)
      setFormError('')
      await createRequest(form)
      setShowModal(false)
      showToast(`Standing request ${form.request_id} created successfully.`)
      load()
    } catch (err) {
      setFormError(err?.response?.data?.detail || 'Failed to create request.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (request) => {
    const newStatus = request.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    try {
      await updateRequestStatus(request.request_id, newStatus)
      showToast(`Request ${request.request_id} status updated to ${newStatus}.`)
      load()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to update request status.', 'error')
    }
  }

  const handleDelete = async (requestId) => {
    if (!window.confirm(`Are you sure you want to delete standing request ${requestId}?`)) {
      return
    }
    try {
      await deleteRequest(requestId)
      showToast(`Request ${requestId} deleted successfully.`)
      load()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to delete request.', 'error')
    }
  }

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Status filter
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
      // Type filter
      if (typeFilter !== 'ALL' && r.result_type !== typeFilter) return false
      // Search
      if (search.trim()) {
        const q = search.toLowerCase()
        const pName = patientsMap[r.patient_id]?.name?.toLowerCase() || ''
        const cName = cliniciansMap[r.requested_by]?.name?.toLowerCase() || ''
        const matchesId = r.request_id?.toLowerCase().includes(q)
        const matchesPatient = r.patient_id?.toLowerCase().includes(q) || pName.includes(q)
        const matchesClinician = r.requested_by?.toLowerCase().includes(q) || cName.includes(q)
        const matchesType = r.result_type?.toLowerCase().includes(q)
        const matchesCondition = r.condition?.toLowerCase().includes(q)
        return matchesId || matchesPatient || matchesClinician || matchesType || matchesCondition
      }
      return true
    })
  }, [requests, statusFilter, typeFilter, search, patientsMap, cliniciansMap])

  // KPIs
  const activeCount = requests.filter((r) => r.status === 'ACTIVE').length
  const uniquePatients = new Set(requests.map((r) => r.patient_id)).size
  const uniqueTypes = new Set(requests.map((r) => r.result_type)).size

  const inputCls =
    'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white'

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

      {/* Header with Title and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Standing Requests</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Automated notification triggers that route clinical results to the actively responsible clinician at event time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button icon={Plus} onClick={handleOpenModal}>
            New Request
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Requests
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ClipboardList size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{requests.length}</p>
          <span className="text-xs text-slate-400">Configured in engine</span>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Triggers
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Activity size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{activeCount}</p>
          <span className="text-xs text-emerald-600 font-medium">Monitoring incoming results</span>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Patients Monitored
            </span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <User size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{uniquePatients}</p>
          <span className="text-xs text-slate-400">Under standing orders</span>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Result Types
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Sparkles size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{uniqueTypes}</p>
          <span className="text-xs text-slate-400">Labs, imaging & tests</span>
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
              placeholder="Search by Request ID, patient name, clinician, or condition..."
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

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-xs">
              {['ALL', 'ACTIVE', 'PAUSED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    statusFilter === st
                      ? 'bg-white text-blue-700 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'ALL' ? 'All Statuses' : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Type selector */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-blue-400"
            >
              <option value="ALL">All Result Types</option>
              {RESULT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <SkeletonTable rows={5} cols={7} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : requests.length === 0 ? (
        <Card className="p-16 text-center">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <ClipboardList size={36} className="opacity-30" />
            <p className="text-base font-semibold text-slate-700">No standing requests configured</p>
            <p className="text-xs text-slate-500 max-w-sm">
              Create a standing request to instruct WatchTransfer to monitor incoming results and alert the actively responsible clinician.
            </p>
            <Button icon={Plus} size="sm" onClick={handleOpenModal} className="mt-2">
              Create First Request
            </Button>
          </div>
        </Card>
      ) : filteredRequests.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Search size={28} className="opacity-30" />
            <p className="text-sm font-medium text-slate-700">No requests match your filter</p>
            <p className="text-xs text-slate-500">Try adjusting your search query or filter criteria.</p>
            <button
              onClick={() => { setSearch(''); setStatusFilter('ALL'); setTypeFilter('ALL') }}
              className="text-xs text-blue-600 hover:underline mt-2 font-medium"
            >
              Clear filters
            </button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-slate-200 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Request ID
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Requested By
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Result Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Condition / Trigger Criteria
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((r) => {
                  const patient = patientsMap[r.patient_id]
                  const clinician = cliniciansMap[r.requested_by]
                  const isActive = r.status === 'ACTIVE'

                  return (
                    <tr
                      key={r.request_id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Request ID */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                          {r.request_id}
                        </span>
                      </td>

                      {/* Patient */}
                      <td className="px-4 py-3.5">
                        <Link
                          to={`/patients/${r.patient_id}`}
                          className="group-hover:text-blue-600 transition-colors"
                        >
                          <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                            <span>{patient ? patient.name : r.patient_id}</span>
                            <ExternalLink size={12} className="opacity-0 group-hover:opacity-60 text-blue-600 transition-opacity" />
                          </div>
                          <span className="text-xs font-mono text-slate-400">
                            {r.patient_id}
                          </span>
                        </Link>
                      </td>

                      {/* Requested By */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800 text-sm">
                          {clinician ? clinician.name : r.requested_by}
                        </div>
                        <div className="text-xs text-slate-400">
                          <span className="font-mono">{r.requested_by}</span>
                          {clinician?.role && <span> · {clinician.role}</span>}
                        </div>
                      </td>

                      {/* Result Type */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-sky-50 text-sky-700 rounded-full text-xs font-medium border border-sky-100">
                          <FileText size={11} className="text-sky-500" />
                          {r.result_type}
                        </span>
                      </td>

                      {/* Condition / Criteria */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="text-xs font-medium text-slate-700 truncate" title={r.condition}>
                          {r.condition}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StatusBadge status={r.status} />
                      </td>

                      {/* Created At */}
                      <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-500">
                          <Clock size={12} className="text-slate-400" />
                          {formatDateTime(r.created_at)}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleStatus(r)}
                            title={isActive ? 'Pause monitoring' : 'Activate request'}
                            className={`p-1.5 rounded-lg border text-xs transition-colors ${
                              isActive
                                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {isActive ? <Pause size={14} /> : <Play size={14} />}
                          </button>
                          <button
                            onClick={() => handleDelete(r.request_id)}
                            title="Delete request"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Modal */}
      {showModal && (
        <Modal
          title="Create Standing Notification Request"
          onClose={() => setShowModal(false)}
          size="lg"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Request ID */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Request ID</label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        request_id: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
                      }))
                    }
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Sparkles size={10} /> Auto-generate
                  </button>
                </div>
                <input
                  className={inputCls}
                  placeholder="e.g. REQ-1042"
                  value={form.request_id}
                  onChange={(e) => setForm((f) => ({ ...f, request_id: e.target.value }))}
                />
              </div>

              {/* Result Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Result Type To Monitor
                </label>
                <select
                  className={inputCls}
                  value={form.result_type}
                  onChange={(e) => setForm((f) => ({ ...f, result_type: e.target.value }))}
                >
                  {RESULT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Patient */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Patient</label>
                <select
                  className={inputCls}
                  value={form.patient_id}
                  onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
                >
                  <option value="">Select patient</option>
                  {patients.map((p) => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.name} ({p.patient_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Requested By */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ordering Clinician
                </label>
                <select
                  className={inputCls}
                  value={form.requested_by}
                  onChange={(e) => setForm((f) => ({ ...f, requested_by: e.target.value }))}
                >
                  <option value="">Select clinician</option>
                  {clinicians.map((c) => (
                    <option key={c.clinician_id} value={c.clinician_id}>
                      {c.name} ({c.clinician_id} · {c.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Condition / Criteria */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Condition / Trigger Criteria
              </label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={2}
                placeholder="e.g. When available, or Troponin > 0.04 ng/mL..."
                value={form.condition}
                onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
              />

              {/* Quick condition chips */}
              <div className="mt-2">
                <p className="text-[11px] text-slate-400 mb-1 font-medium">Quick condition templates:</p>
                <div className="flex flex-wrap gap-1.5">
                  {CONDITION_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, condition: preset }))}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 text-slate-600 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Explanation Note */}
            <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 text-xs text-blue-800">
              <p className="font-semibold flex items-center gap-1.5">
                <Sparkles size={13} className="text-blue-600" />
                How WatchTransfer routes results:
              </p>
              <p className="mt-0.5 text-blue-700">
                When a matching result arrives, WatchTransfer identifies the clinician actively responsible for the patient at the exact result timestamp (`event_time`), rather than routing blindly to the ordering clinician.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating…' : 'Create Request'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
