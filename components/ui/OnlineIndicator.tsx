const STATUS_LABELS: Record<string, string> = {
  available:        'Verfügbar',
  looking_for_chat: 'Suche Gespräch',
  looking_for_date: 'Suche Date',
  busy:             'Beschäftigt',
  do_not_disturb:   'Nicht stören',
}

export function getStatusColor(is_online: boolean, status_message?: string | null): string {
  if (!is_online) return '#52525b'
  switch (status_message) {
    case 'available':        return '#4ade80'
    case 'looking_for_chat': return '#60a5fa'
    case 'looking_for_date': return '#c084fc'
    case 'busy':             return '#f59e0b'
    case 'do_not_disturb':   return '#f87171'
    default:                 return '#4ade80'
  }
}

export function OnlineIndicator({
  is_online,
  status_message,
  size = 'sm',
}: {
  is_online: boolean
  status_message?: string | null
  size?: 'sm' | 'md'
}) {
  const dotClass = size === 'sm' ? 'h-2 w-2' : 'h-3 w-3'
  const label = status_message ? (STATUS_LABELS[status_message] ?? null) : null
  const ariaLabel = is_online
    ? label ? `Online – ${label}` : 'Online'
    : label ? `Offline – ${label}` : 'Offline'

  return (
    <span className="inline-flex items-center gap-1.5" aria-label={ariaLabel}>
      <span
        className={`${dotClass} rounded-full flex-shrink-0`}
        style={{ backgroundColor: getStatusColor(is_online, status_message) }}
        aria-hidden="true"
      />
      {label && (
        <span className="text-xs text-on-surface-variant">{label}</span>
      )}
    </span>
  )
}
