import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, ChevronRight, Users } from 'lucide-react'
import { getPatients, createPatient } from '../api'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import SkeletonTable from '../components/Skeleton'
import ErrorState from '../components/ErrorState'

export default function Patients() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ patient_id: '', name: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getPatients()
      setPatients(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Unable to load patients.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = patients.filter(
    p =>
      p.patient_id.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.patient_id || !form.name) { setFormError('All fields are required.'); return }
    try {
      setSaving(true); setFormError('')
      await createPatient(form)
      setShowModal(false)
      setForm({ patient_id: '', name: '' })
      load()
    } catch (err) {
      setFormError(err?.response?.data?.detail || 'Failed to create patient.')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div />
        <Button icon={Plus} onClick={() => setShowModal(true)}>Add Patient</Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search patients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        />
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={6} cols={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <Card className="p-16 text-center">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Users size={32} className="opacity-30" />
            <p className="text-sm font-medium">No patients found</p>
            <p className="text-xs">
              {search ? 'Try a different search term.' : 'Add your first patient to get started.'}
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Patient</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Patient ID</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.patient_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-blue-700">{p.patient_id.slice(-2)}</span>
                        </div>
                        <span className="font-medium text-slate-900">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{p.patient_id}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status="ACTIVE" />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/patients/${p.patient_id}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Patient Modal */}
      {showModal && (
        <Modal title="Add Patient" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {formError}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Patient ID</label>
              <input
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                placeholder="e.g. P001"
                value={form.patient_id}
                onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Full Name</label>
              <input
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                placeholder="e.g. Patient One"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Patient'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
