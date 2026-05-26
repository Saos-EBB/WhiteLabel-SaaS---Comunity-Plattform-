'use client'

import { useState } from 'react'
import { Loader2, AlertCircle, X, Check, ChevronDown } from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'

interface Props {
  reportedUserId?: string
  messageId?: string
  onClose: () => void
}

export default function ReportModal({ reportedUserId, messageId, onClose }: Props) {
  const { t } = useTranslation()

  const REASON_OPTIONS = [
    { value: 'harassment', label: t.report.reasonHarassment },
    { value: 'spam',       label: t.report.reasonSpam },
    { value: 'fake',       label: t.report.reasonFakeProfile },
    { value: 'sexual',     label: t.report.reasonInappropriate },
    { value: 'abuse',      label: t.report.reasonAbuse },
  ]

  const [nickname, setNickname]       = useState('')
  const [reason, setReason]           = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus]           = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg]       = useState<string | null>(null)

  async function handleSubmit() {
    if (!reason || status === 'loading') return
    setStatus('loading')
    setErrorMsg(null)
    try {
      let userId = reportedUserId
      if (!userId) {
        if (!nickname.trim()) {
          setErrorMsg(t.report.errorNoUsername)
          setStatus('idle')
          return
        }
        const p = await fetchApi<{ user_id: string }>(`/profile/${encodeURIComponent(nickname.trim())}`)
        userId = p.user_id
      }
      await fetchApi<unknown>('/moderation/reports', {
        method: 'POST',
        body: JSON.stringify({
          reported_user_id: userId,
          reason,
          description: description.trim() || undefined,
          ...(messageId ? { message_id: messageId } : {}),
        }),
      })
      setStatus('success')
      setTimeout(onClose, 2000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t.report.errorFailed)
      setStatus('error')
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={() => status !== 'loading' && onClose()}
        aria-hidden="true"
      />
      {/* pb-16 = nav bar height (h-16) on mobile so the sheet clears the fixed bottom nav */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none pb-16 sm:pb-0">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
          className="pointer-events-auto bg-surface-container rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 id="report-modal-title" className="text-lg font-bold text-on-surface">
              {t.report.title}
            </h2>
            <button
              onClick={onClose}
              disabled={status === 'loading'}
              aria-label={t.common.close}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4 text-on-surface-variant" aria-hidden="true" />
            </button>
          </div>

          {status === 'success' ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="h-12 w-12 rounded-full bg-primary-fixed-dim/20 flex items-center justify-center">
                <Check className="h-6 w-6 text-primary-fixed-dim" aria-hidden="true" />
              </div>
              <p className="font-semibold text-on-surface">{t.report.successTitle}</p>
              <p className="text-sm text-on-surface-variant">{t.report.successDesc}</p>
            </div>
          ) : (
            <>
              {!reportedUserId && (
                <div className="space-y-1.5">
                  <label htmlFor="report-nickname" className="text-sm font-medium text-on-surface">
                    {t.report.username}
                  </label>
                  <input
                    id="report-nickname"
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder={t.report.usernamePlaceholder}
                    disabled={status === 'loading'}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-fixed-dim min-h-[44px] transition-colors"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="report-reason" className="text-sm font-medium text-on-surface">
                  {t.report.reason} <span className="text-error" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <select
                    id="report-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={status === 'loading'}
                    className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim min-h-[44px] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <option value="">{t.report.reasonPlaceholder}</option>
                    {REASON_OPTIONS.map((o) => (
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
                <label htmlFor="report-description" className="text-sm font-medium text-on-surface">
                  {t.report.description}{' '}
                  <span className="text-on-surface-variant text-xs font-normal">(optional)</span>
                </label>
                <textarea
                  id="report-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder={t.report.descriptionPlaceholder}
                  disabled={status === 'loading'}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-fixed-dim resize-none transition-colors disabled:opacity-50"
                />
                <p className="text-xs text-on-surface-variant text-right">{description.length}/500</p>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-error-container text-error px-4 py-3 text-sm" role="alert">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {errorMsg}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!reason || status === 'loading'}
                className="w-full py-3 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-sm min-h-[44px] hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {status === 'loading' && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {t.report.submit}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
