'use client'

import { useState } from 'react'
import { AlertCircle, Check, Loader2, X } from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'

interface Props {
  onClose: () => void
}

export default function ContactSupportModal({ onClose }: Props) {
  const { t } = useTranslation()

  const [email,    setEmail]    = useState('')
  const [nickname, setNickname] = useState('')
  const [publicId, setPublicId] = useState('')
  const [message,  setMessage]  = useState('')
  const [status,   setStatus]   = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSubmit() {
    if (!email || !message || status === 'loading') return
    setStatus('loading')
    setErrorMsg(null)
    try {
      await fetchApi<{ message: string }>('/support/contact', {
        method: 'POST',
        body: JSON.stringify({
          email,
          ...(nickname.trim() ? { nickname: nickname.trim() } : {}),
          ...(publicId.trim() ? { public_id: publicId.trim() } : {}),
          message,
        }),
      })
      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t.common.error)
      setStatus('error')
    }
  }

  const inputClass =
    'w-full px-3 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-fixed-dim min-h-[44px] transition-colors disabled:opacity-50'

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
          aria-labelledby="support-modal-title"
          className="pointer-events-auto bg-surface-container rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 id="support-modal-title" className="text-lg font-bold text-on-surface">
              {t.support.title}
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
              <p className="font-semibold text-on-surface">{t.support.successTitle}</p>
              <p className="text-sm text-on-surface-variant">{t.support.successDesc}</p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label htmlFor="support-email" className="text-sm font-medium text-on-surface">
                  {t.support.email} <span className="text-error" aria-hidden="true">*</span>
                </label>
                <input
                  id="support-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.support.emailPlaceholder}
                  disabled={status === 'loading'}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="support-nickname" className="text-sm font-medium text-on-surface">
                  {t.support.nickname}{' '}
                  <span className="text-on-surface-variant text-xs font-normal">(optional)</span>
                </label>
                <input
                  id="support-nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t.support.nicknamePlaceholder}
                  disabled={status === 'loading'}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="support-public-id" className="text-sm font-medium text-on-surface">
                  {t.support.profileId}{' '}
                  <span className="text-on-surface-variant text-xs font-normal">(optional)</span>
                </label>
                <input
                  id="support-public-id"
                  type="text"
                  value={publicId}
                  onChange={(e) => setPublicId(e.target.value)}
                  placeholder={t.support.profileIdPlaceholder}
                  disabled={status === 'loading'}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="support-message" className="text-sm font-medium text-on-surface">
                  {t.support.message} <span className="text-error" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="support-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
                  rows={4}
                  placeholder={t.support.messagePlaceholder}
                  disabled={status === 'loading'}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-fixed-dim resize-none transition-colors disabled:opacity-50"
                />
                <p className="text-xs text-on-surface-variant text-right">{message.length}/1000</p>
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
                  disabled={!email || !message || status === 'loading'}
                  className="flex-1 py-3 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-sm min-h-[44px] hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {status === 'loading' && (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  {t.support.submit}
                </button>
                <button
                  onClick={onClose}
                  disabled={status === 'loading'}
                  className="flex-1 py-3 rounded-full border border-outline-variant text-on-surface font-semibold text-sm min-h-[44px] hover:bg-surface-container-high transition-colors disabled:opacity-50"
                >
                  {t.support.cancel}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
