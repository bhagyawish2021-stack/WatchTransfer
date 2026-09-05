// Shared utility helpers

/** Format an ISO timestamp to readable time e.g. "10:08 AM" */
export function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Format an ISO timestamp to date + time e.g. "Sep 5, 2026 · 10:08 AM" */
export function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Parse JSON metadata string safely */
export function parseMeta(str) {
  if (!str) return null
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

/** Map event_type to a display color class set */
export function eventTypeColor(type) {
  const map = {
    REQUEST_CREATED: 'bg-blue-50 text-blue-700 border-blue-200',
    HANDOFF_RECEIVED: 'bg-amber-50 text-amber-700 border-amber-200',
    TIMELINE_RECONSTRUCTED: 'bg-sky-50 text-sky-700 border-sky-200',
    RESULT_RECEIVED: 'bg-purple-50 text-purple-700 border-purple-200',
    RESPONSIBILITY_RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    NOTIFICATION_CREATED: 'bg-orange-50 text-orange-700 border-orange-200',
    NOTIFICATION_ACKNOWLEDGED: 'bg-green-50 text-green-700 border-green-200',
  }
  return map[type] || 'bg-slate-50 text-slate-700 border-slate-200'
}

/** Map notification/request status to badge colours */
export function statusColor(status) {
  const map = {
    ACTIVE:           'bg-emerald-50 text-emerald-700',
    PENDING:          'bg-amber-50 text-amber-700',
    ACKNOWLEDGED:     'bg-green-50 text-green-700',
    RESOLVED:         'bg-blue-50 text-blue-700',
    FAILED:           'bg-red-50 text-red-700',
    COMPLETED:        'bg-slate-50 text-slate-600',
    PAUSED:           'bg-slate-50 text-slate-600',
    PROCESSED:        'bg-sky-50 text-sky-700',
  }
  return map[status] || 'bg-slate-50 text-slate-600'
}
