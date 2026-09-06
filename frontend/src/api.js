import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('API Error:', err?.response?.data || err.message)
    return Promise.reject(err)
  }
)

// ── Patients ─────────────────────────────────────────────
export const getPatients = () => api.get('/patients/')
export const getPatient = (id) => api.get(`/patients/${id}`)
export const createPatient = (data) => api.post('/patients/', data)
export const getPatientAudit = (id) => api.get(`/patients/${id}/audit`)
export const getPatientTimeline = (id) => api.get(`/patients/${id}/timeline`)
export const getPatientResponsible = (id, timestamp) =>
  api.get(`/patients/${id}/responsible`, { params: { timestamp } })

// ── Clinicians ────────────────────────────────────────────
export const getClinicians = () => api.get('/clinicians/')
export const getClinician = (id) => api.get(`/clinicians/${id}`)
export const createClinician = (data) => api.post('/clinicians/', data)
export const updateClinicianAvailability = (id, data) =>
  api.patch(`/clinicians/${id}/availability`, data)

// ── Standing Requests ─────────────────────────────────────
export const getRequests = () => api.get('/requests/')
export const getRequest = (id) => api.get(`/requests/${id}`)
export const createRequest = (data) => api.post('/requests/', data)
export const updateRequestStatus = (id, status) => api.patch(`/requests/${id}/status`, { status })
export const deleteRequest = (id) => api.delete(`/requests/${id}`)


// ── Handoffs ──────────────────────────────────────────────
export const getHandoffs = () => api.get('/handoffs/')
export const createHandoff = (data) => api.post('/handoffs/', data)

// ── Results ───────────────────────────────────────────────
export const getResults = () => api.get('/results/')
export const createResult = (data) => api.post('/results/', data)

// ── Notifications ─────────────────────────────────────────
export const getNotifications = () => api.get('/notifications/')
export const getClinicianNotifications = (id) => api.get(`/notifications/${id}`)
export const acknowledgeNotification = (id) =>
  api.patch(`/notifications/${id}/acknowledge`)
export const escalateSlaBreaches = () =>
  api.post('/notifications/escalate-sla-breaches')
export const escalateNotification = (id, reason) =>
  api.post(`/notifications/${id}/escalate`, null, { params: { reason } })

// ── Audit ─────────────────────────────────────────────────
export const getAuditLogs = () => api.get('/audit/')
export const getAuditLog = (id) => api.get(`/audit/${id}`)

export default api
