import { useEffect, useState } from 'react'
import { Plus, ClipboardList } from 'lucide-react'
import { getRequests, createRequest, getPatients, getClinicians } from '../api'
import { formatDateTime } from '../utils'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import SkeletonTable from '../components/Skeleton'
import ErrorState from '../components/ErrorState'

const RESULT_TYPES = ['Blood Test', 'ECG', 'X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'Biopsy', 'Urine Test']

export default function Requests() {
  const [requests, setRequests] = useState([])
  const [patients, setPatients] = useState([])
  const [clinicians, setClinicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({
    request_id: '', patient_id: '', requested_by: '',
    result_type: 'Blood Test', condition: '', status: 'ACTIVE',
  })

  const load = async () => {
    try {
      setLoading(true); setError(null)
      const [r, p, c] = await Promise.all([getRequests(), getPatients(), getClinicians()])
      setRequests(r.data); setPatients(p.data); setClinicians(c.data)
    } catch { setError('Unable to load standing requests.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.request_id || !form.patient_id || !form.requested_by || !form.condition) {
      setFormError('All fields are required.'); return
    }
    try {
      setSaving(true); setFormError('')
      await createRequest(form)
      setShowModal(false)
      setForm({ request_id: '', patient_id: '', requested_by: '', result_type: 'Blood Test', condition: '', status: 'ACTIVE' })
      load()
    } catch (err) {
      setFormError(err?.response?.data?.detail || 'Failed to create request.')
    } finally { setSaving(false) }
  }

  const inputCls = 'w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white'

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button icon={Plus} onClick={() => setShowModal(true)}>New Request</Button>
      </div>

      {loading ? <SkeletonTable rows={5} cols={6} /> :
       error   ? <ErrorState message={error} onRetry={load} /> :
       requests.length === 0 ? (
        <Card className="p-16 text-center">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <ClipboardList size={32} className="opacity-30" />
            <p className="text-sm font-medium">No standing requests yet</p>
            <p className="text-xs">Create the first standing request to start tracking results.</p>
          </div>
        </Card>
       ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Request ID', 'Patient', 'Requested By', 'Result Type', 'Status', 'Created'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.request_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{r.request_id}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">{r.patient_id}</td>
                    <td className="px-5 py-3.5 text-slate-600">{r.requested_by}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 bg-sky-50 text-sky-700 rounded-full text-xs font-medium border border-sky-100">
                        {r.result_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">{formatDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
       )}

      {showModal && (
        <Modal title="Create Standing Request" onClose={() => setShowModal(false)} size="lg">
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Request ID</label>
                <input className={inputCls} placeholder="e.g. R001" value={form.request_id}
                  onChange={e => setForm(f => ({ ...f, request_id: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Patient</label>
                <select className={inputCls} value={form.patient_id}
                  onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}>
                  <option value="">Select patient</option>
                  {patients.map(p => <option key={p.patient_id} value={p.patient_id}>{p.name} ({p.patient_id})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Requested By</label>
                <select className={inputCls} value={form.requested_by}
                  onChange={e => setForm(f => ({ ...f, requested_by: e.target.value }))}>
                  <option value="">Select clinician</option>
                  {clinicians.map(c => <option key={c.clinician_id} value={c.clinician_id}>{c.name} ({c.clinician_id})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Result Type</label>
                <select className={inputCls} value={form.result_type}
                  onChange={e => setForm(f => ({ ...f, result_type: e.target.value }))}>
                  {RESULT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Condition / Notes</label>
              <textarea className={`${inputCls} resize-none`} rows={3}
                placeholder="Describe the condition or additional notes..."
                value={form.condition}
                onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Request'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
