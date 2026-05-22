'use client'

import { useState } from 'react'
import { AlertCircle, ChevronDown, Loader2, X } from 'lucide-react'
import { fetchApi } from '@/lib/api'

const DURATION_OPTIONS = [
  { value: '24h',       label: '24 Stunden' },
  { value: '7d',        label: '7 Tage' },
  { value: '30d',       label: '30 Tage' },
  { value: 'permanent', label: 'Permanent' },
]

const REASON_OPTIONS = [
  'Belästigung',
  'Spam',
  'Unangemessene Inhalte',
  'Wiederholter Verstoß',
  'Sonstiges',
]

interface Props {
  userId: string
  nickname: string
  reportId?: string
  onSuccess: () => void
  onClose: () => void
}

export default function BanModal({ userId, nickname, reportId, onSuccess, onClose }: Props) {
  const [duration, setDuration] = useState('')
  const [reason, setReason]     = useState('')
  const [note, setNote]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSubmit() {
    if (!duration || !reason || loading) return
    setLoading(true)
    setErrorMsg(null)
    const finalReason = note.trim() ? `${reason}: ${note.trim()}` : reason
    try {
      await fetchApi<unknown>(`/admin/users/${userId}/ban`, {
        method: 'PATCH',
        body: JSON.stringify({
          duration,
          reason: finalReason,
          ...(reportId ? { report_id: reportId } : {}),
        }),
      })
      onSuccess()
      onClose()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Fehler beim Sperren')
      setLoading(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ban-modal-title"
          className="pointer-events-auto bg-surface-container rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 id="ban-modal-title" className="text-lg font-bold text-on-surface">
              User sperren — {nickname}
            </h2>
            <button
              onClick={onClose}
              disabled={loading}
              aria-label="Schließen"
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4 text-on-surface-variant" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ban-duration" className="text-sm font-medium text-on-surface">
              Sperrdauer <span className="text-error" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <select
                id="ban-duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                disabled={loading}
                className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim min-h-[44px] transition-colors cursor-pointer disabled:opacity-50"
              >
                <option value="">Bitte wählen…</option>
                {DURATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none"
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ban-reason" className="text-sm font-medium text-on-surface">
              Grund <span className="text-error" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <select
                id="ban-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={loading}
                className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim min-h-[44px] transition-colors cursor-pointer disabled:opacity-50"
              >
                <option value="">Bitte wählen…</option>
                {REASON_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none"
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ban-note" className="text-sm font-medium text-on-surface">
              Notiz{' '}
              <span className="text-on-surface-variant text-xs font-normal">(optional)</span>
            </label>
            <textarea
              id="ban-note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Zusätzliche Informationen..."
              disabled={loading}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-fixed-dim resize-none transition-colors disabled:opacity-50"
            />
            <p className="text-xs text-on-surface-variant text-right">{note.length}/500</p>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-error-container text-error px-4 py-3 text-sm" role="alert">
              <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              onClick={handleSubmit}
              disabled={!duration || !reason || loading}
              className="flex-1 py-3 rounded-full bg-error-container text-error font-semibold text-sm min-h-[44px] hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Sperren
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 rounded-full border border-outline-variant text-on-surface font-semibold text-sm min-h-[44px] hover:bg-surface-container-high transition-colors disabled:opacity-50"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
