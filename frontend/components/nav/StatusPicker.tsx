'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import { OnlineIndicator } from '@/components/ui/OnlineIndicator'
import { useTranslation } from '@/lib/i18n'

type StatusMessage = 'available' | 'looking_for_chat' | 'looking_for_date' | 'busy' | 'do_not_disturb' | null

export function StatusPicker() {
  const { t }        = useTranslation()
  const accessToken  = useAuthStore((s) => s.accessToken)
  const user         = useAuthStore((s) => s.user)
  const setUser      = useAuthStore((s) => s.setUser)

  // Optimistic overrides — null/undefined means "use store value"
  const [pendingVisible, setPendingVisible] = useState<boolean | null>(null)
  const [pendingMessage, setPendingMessage] = useState<StatusMessage | 'unset'>('unset')
  const [statusSaving, setStatusSaving]     = useState(false)
  const [statusOpen, setStatusOpen]         = useState(false)
  const statusRef                           = useRef<HTMLDivElement>(null)

  // Derive effective values from store; pending override wins while saving
  const statusVisible = pendingVisible !== null
    ? pendingVisible
    : ((user?.statusVisible as boolean | undefined) ?? true)
  const statusMessage = pendingMessage !== 'unset'
    ? pendingMessage
    : ((user?.statusMessage as StatusMessage | undefined) ?? null)

  const STATUS_OPTIONS: { value: StatusMessage; label: string; color: string }[] = [
    { value: 'available',        label: t.status.available,      color: '#4ade80' },
    { value: 'looking_for_chat', label: t.status.lookingToTalk,  color: '#60a5fa' },
    { value: 'looking_for_date', label: t.status.lookingForDate, color: '#c084fc' },
    { value: 'busy',             label: t.status.busy,           color: '#f59e0b' },
    { value: 'do_not_disturb',   label: t.status.doNotDisturb,   color: '#f87171' },
  ]

  useEffect(() => {
    if (!statusOpen) return
    function onOutside(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [statusOpen])

  async function handleSetStatus(value: StatusMessage) {
    if (statusSaving) return
    setPendingMessage(value)
    setStatusSaving(true)
    try {
      await fetchApi('/profile/me', {
        method: 'PUT',
        body: JSON.stringify({ status_message: value }),
      })
      if (user) setUser({ ...user, statusMessage: value })
    } catch {
      setPendingMessage('unset')
    } finally {
      setStatusSaving(false)
    }
    setStatusOpen(false)
  }

  async function handleToggleVisible() {
    if (statusSaving) return
    const next = !statusVisible
    setPendingVisible(next)
    setStatusSaving(true)
    try {
      await fetchApi('/profile/me', {
        method: 'PUT',
        body: JSON.stringify({ status_visible: next }),
      })
      if (user) setUser({ ...user, statusVisible: next })
    } catch {
      setPendingVisible(null)
    } finally {
      setStatusSaving(false)
    }
  }

  return (
    <div className="relative" ref={statusRef}>
      <button
        aria-label={t.status.label}
        aria-expanded={statusOpen}
        onClick={() => setStatusOpen((v) => !v)}
        className="p-2 rounded-lg hover:bg-surface-container transition-colors flex items-center justify-center"
      >
        <span className="pointer-events-none [&>span>span:last-child]:hidden">
          <OnlineIndicator
            is_online={!!accessToken}
            status_message={statusMessage}
            size="sm"
          />
        </span>
      </button>

      {statusOpen && (
        <div
          role="dialog"
          aria-label={t.status.choose}
          className="fixed top-16 left-2 right-2 md:absolute md:left-0 md:right-auto md:top-full md:mt-2 md:w-56 rounded-2xl bg-surface-container border border-outline-variant shadow-xl z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-outline-variant">
            <span className="text-sm font-semibold text-on-surface">Status</span>
          </div>

          <ul>
            {STATUS_OPTIONS.map(({ value, label, color }) => (
              <li key={value ?? 'none'}>
                <button
                  onClick={() => handleSetStatus(value)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-surface-container-high ${
                    statusMessage === value ? 'text-on-surface font-medium' : 'text-on-surface-variant'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  {label}
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-outline-variant px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-sm text-on-surface-variant">{t.status.invisible}</span>
            <button
              role="switch"
              aria-checked={!statusVisible}
              onClick={handleToggleVisible}
              disabled={statusSaving}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${
                !statusVisible ? 'bg-primary-fixed-dim' : 'bg-surface-container-high'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition duration-200 ${
                  !statusVisible ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
