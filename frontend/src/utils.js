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
    CLINICIAN_AVAILABILITY_CHANGED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    NOTIFICATION_ESCALATED: 'bg-orange-50 text-orange-700 border-orange-200',
    ESCALATION_REQUIRED: 'bg-rose-50 text-rose-700 border-rose-300',
    RESULT_RE_EVALUATED: 'bg-teal-50 text-teal-700 border-teal-200',
  }
  return map[type] || 'bg-slate-50 text-slate-700 border-slate-200'
}

/** Map notification/request status to badge colours */
export function statusColor(status) {
  const map = {
    ACTIVE:               'bg-emerald-50 text-emerald-700 border-emerald-200',
    PENDING:              'bg-amber-50 text-amber-700 border-amber-200',
    ESCALATED:            'bg-orange-50 text-orange-700 border-orange-200',
    ESCALATION_REQUIRED:  'bg-rose-50 text-rose-700 border-rose-300',
    ACKNOWLEDGED:         'bg-green-50 text-green-700 border-green-200',
    RESOLVED:             'bg-blue-50 text-blue-700 border-blue-200',
    FAILED:               'bg-red-50 text-red-700 border-red-200',
    COMPLETED:            'bg-slate-50 text-slate-600 border-slate-200',
    PAUSED:               'bg-slate-50 text-slate-600 border-slate-200',
    PROCESSED:            'bg-sky-50 text-sky-700 border-sky-200',
  }
  return map[status] || 'bg-slate-50 text-slate-600 border-slate-200'
}

/** Availability config and helpers */
export const AVAILABILITY_CONFIG = {
  AVAILABLE: {
    label: 'Available',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    icon: '🟢',
  },
  BUSY: {
    label: 'Busy',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    icon: '🟡',
  },
  UNAVAILABLE: {
    label: 'Unavailable',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    icon: '🔴',
  },
  ON_CALL: {
    label: 'On Call',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    icon: '🔵',
  },
  OFF_DUTY: {
    label: 'Off Duty',
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
    dot: 'bg-slate-500',
    icon: '⚫',
  },
}

export function getAvailabilityConfig(status) {
  return (
    AVAILABILITY_CONFIG[status] || {
      label: status || 'Unknown',
      badge: 'bg-slate-100 text-slate-600 border-slate-200',
      dot: 'bg-slate-400',
      icon: '⚪',
    }
  )
}

