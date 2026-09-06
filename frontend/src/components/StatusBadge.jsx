import { statusColor, getAvailabilityConfig } from '../utils'

const AVAILABILITY_STATUSES = new Set(['AVAILABLE', 'BUSY', 'UNAVAILABLE', 'ON_CALL', 'OFF_DUTY'])

export function AvailabilityBadge({ status, showIcon = true, className = '' }) {
  if (!status) return null
  const config = getAvailabilityConfig(status)
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.badge} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  )
}

export default function StatusBadge({ status, type, className = '' }) {
  if (!status) return null

  if (type === 'availability' || AVAILABILITY_STATUSES.has(status)) {
    return <AvailabilityBadge status={status} className={className} />
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor(
        status
      )} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  )
}

