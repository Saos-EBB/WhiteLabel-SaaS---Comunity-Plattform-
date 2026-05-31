'use client'

import { useTranslation } from '@/lib/i18n'

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
  const { t } = useTranslation()
  const STATUS_LABELS: Record<string, string> = {
    available:        t.status.available,
    looking_for_chat: t.status.lookingToTalk,
    looking_for_date: t.status.lookingForDate,
    busy:             t.status.busy,
    do_not_disturb:   t.status.doNotDisturb,
  }
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
