'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import { useSearch } from '@/hooks/useSearch'
import { Divider } from './shared/Divider'
import { Spinner } from './shared/Spinner'
import { Pagination } from './shared/Pagination'
import { ModalOverlay } from './shared/ModalOverlay'
import { btnPrimary, btnOutline, inputCls, fmtDate } from './shared/utils'
import type { AdminStrike, AdminUser, Paginated } from './shared/types'

interface Props {
  showToast: (msg: string, ok?: boolean) => void
}

export function StrikesTab({ showToast }: Props) {
  const { t } = useTranslation()

  const [strikes, setStrikes] = useState<Paginated<AdminStrike> | null>(null)
  const [strikesLoading, setStrikesLoading] = useState(false)
  const [strikePage, setStrikePage] = useState(1)

  const [strikeModal, setStrikeModal] = useState(false)
  const [strikeUserId, setStrikeUserId] = useState('')
  const [strikeType, setStrikeType] = useState<'warning' | 'temp' | 'permanent'>('warning')
  const [strikeReason, setStrikeReason] = useState('')
  const [strikeExpires, setStrikeExpires] = useState('')
  const [strikeSaving, setStrikeSaving] = useState(false)

  const [strikeNicknameQuery, setStrikeNicknameQuery] = useState('')
  const [strikeSearchResults, setStrikeSearchResults] = useState<AdminUser[]>([])
  const [strikeSearchLoading, setStrikeSearchLoading] = useState(false)
  const strikeSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { query: strikeListSearch, handleChange: handleStrikeListSearch, filtered: filteredStrikes } =
    useSearch(strikes?.data ?? [], (s, q) => (s.user_nickname ?? '').toLowerCase().includes(q))

  async function loadStrikes(page = strikePage) {
    setStrikesLoading(true)
    try {
      const data = await fetchApi<Paginated<AdminStrike>>(`/admin/strikes?page=${page}&limit=20`)
      setStrikes(data)
      setStrikePage(page)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.admin.loadError, false)
    } finally {
      setStrikesLoading(false)
    }
  }

  async function submitStrike() {
    if (!strikeUserId.trim() || !strikeReason.trim()) return
    if (strikeType === 'temp' && !strikeExpires) return
    setStrikeSaving(true)
    try {
      await fetchApi<unknown>('/admin/strikes', {
        method: 'POST',
        body: JSON.stringify({
          user_id: strikeUserId.trim(),
          type: strikeType,
          reason: strikeReason.trim(),
          ...(strikeType === 'temp' ? { expires_at: new Date(strikeExpires).toISOString() } : {}),
        }),
      })
      setStrikeModal(false)
      setStrikeUserId('')
      setStrikeNicknameQuery('')
      setStrikeSearchResults([])
      setStrikeType('warning')
      setStrikeReason('')
      setStrikeExpires('')
      showToast(t.admin.toastStrikeCreated)
      await loadStrikes(strikePage)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.common.error, false)
    } finally {
      setStrikeSaving(false)
    }
  }

  useEffect(() => {
    void loadStrikes(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5 space-y-4">

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">{t.admin.strikesTitle}</p>
        <button
          onClick={() => {
            setStrikeModal(true)
            setStrikeUserId('')
            setStrikeNicknameQuery('')
            setStrikeSearchResults([])
            setStrikeType('warning')
            setStrikeReason('')
            setStrikeExpires('')
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-fixed-dim text-on-primary-container text-sm font-medium hover:opacity-90 transition-opacity min-h-[40px]"
        >
          <Plus className="h-4 w-4" />
          {t.admin.strikesNew}
        </button>
      </div>

      <input
        type="search"
        placeholder={t.admin.strikesSearchPlaceholder}
        value={strikeListSearch}
        onChange={handleStrikeListSearch}
        className="w-full px-3 py-2 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim min-h-[40px]"
      />

      <Divider />

      {strikesLoading ? (
        <div className="flex justify-center py-8"><Spinner size={6} /></div>
      ) : !strikes || strikes.data.length === 0 ? (
        <p className="text-sm text-on-surface-variant text-center py-8">{t.admin.strikesNone}</p>
      ) : (
        <>
          <div className="overflow-x-auto -mx-4 sm:-mx-5">
            <table className="w-full text-sm min-w-[540px]">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">{t.admin.strikesColUser}</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">{t.admin.strikesColType}</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">{t.admin.strikesColReason}</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">{t.admin.strikesColExpires}</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">{t.admin.strikesColCreated}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredStrikes.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-container-high/50">
                    <td className="px-4 py-3 text-on-surface font-medium">
                      {s.user_nickname ?? s.user_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          s.type === 'permanent' ? 'bg-error-container text-error' :
                          s.type === 'temp'      ? 'bg-error-container/60 text-error' :
                          'bg-surface-container-high text-on-surface-variant'
                        }`}>
                          {s.type}
                        </span>
                        {s.ban_lifted_at && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                            {t.admin.strikesRevoked}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant text-xs max-w-[200px] truncate">{s.reason}</td>
                    <td className="px-4 py-3 text-on-surface-variant text-xs">{fmtDate(s.expires_at)}</td>
                    <td className="px-4 py-3 text-on-surface-variant text-xs">{fmtDate(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={strikes.page} total={strikes.total} limit={strikes.limit} onPage={(p) => void loadStrikes(p)} />
        </>
      )}

      {strikeModal && (
        <ModalOverlay title={t.admin.strikeModalTitle} onClose={() => setStrikeModal(false)}>
          <div className="space-y-3">
            <div className="relative">
              <label className="text-sm text-on-surface-variant block mb-1" htmlFor="strike-nickname">{t.admin.strikeModalNickname}</label>
              <input
                id="strike-nickname"
                type="text"
                value={strikeNicknameQuery}
                onChange={(e) => {
                  const q = e.target.value
                  setStrikeNicknameQuery(q)
                  setStrikeUserId('')
                  if (strikeSearchTimer.current) clearTimeout(strikeSearchTimer.current)
                  if (!q.trim()) { setStrikeSearchResults([]); return }
                  strikeSearchTimer.current = setTimeout(async () => {
                    setStrikeSearchLoading(true)
                    try {
                      const res = await fetchApi<Paginated<AdminUser>>(`/admin/users?search=${encodeURIComponent(q.trim())}&limit=5`)
                      setStrikeSearchResults(res.data)
                    } catch { setStrikeSearchResults([]) }
                    finally { setStrikeSearchLoading(false) }
                  }, 300)
                }}
                onBlur={() => { setTimeout(() => setStrikeSearchResults([]), 200) }}
                placeholder={t.admin.nicknamePlaceholder}
                autoComplete="off"
                className={inputCls}
              />
              {(strikeSearchLoading || strikeSearchResults.length > 0) && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 rounded-xl bg-surface-container-high border border-outline-variant shadow-lg overflow-hidden">
                  {strikeSearchLoading ? (
                    <div className="flex justify-center py-3"><Spinner size={4} /></div>
                  ) : (
                    strikeSearchResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onMouseDown={() => {
                          setStrikeUserId(u.id)
                          setStrikeNicknameQuery(u.nickname ?? u.id.slice(0, 8))
                          setStrikeSearchResults([])
                        }}
                        className="w-full text-left px-3 py-2.5 text-sm text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors"
                      >
                        <span>{u.nickname ?? '—'}</span>
                        {u.vulnerable_flag && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-error-container text-error">{t.admin.usersVulnerable}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm text-on-surface-variant block mb-1" htmlFor="strike-type">{t.admin.strikeModalType}</label>
              <select
                id="strike-type"
                value={strikeType}
                onChange={(e) => setStrikeType(e.target.value as 'warning' | 'temp' | 'permanent')}
                className={inputCls}
              >
                <option value="warning">{`warning — ${t.admin.strikeTypeWarning}`}</option>
                <option value="temp">{`temp — ${t.admin.strikeTypeSuspension}`}</option>
                <option value="permanent">{`permanent — ${t.admin.strikeTypeBan}`}</option>
              </select>
            </div>
            {strikeType === 'temp' && (
              <div>
                <label className="text-sm text-on-surface-variant block mb-1" htmlFor="strike-expires">{t.admin.strikeModalExpiry}</label>
                <input
                  id="strike-expires"
                  type="datetime-local"
                  value={strikeExpires}
                  onChange={(e) => setStrikeExpires(e.target.value)}
                  className={inputCls}
                />
              </div>
            )}
            <div>
              <label className="text-sm text-on-surface-variant block mb-1" htmlFor="strike-reason">{t.admin.strikeModalReason}</label>
              <textarea
                id="strike-reason"
                value={strikeReason}
                onChange={(e) => setStrikeReason(e.target.value)}
                placeholder={t.admin.strikeModalReasonPlaceholder}
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              onClick={() => void submitStrike()}
              disabled={strikeSaving || !strikeUserId.trim() || strikeReason.trim().length < 10 || (strikeType === 'temp' && !strikeExpires)}
              className={`${btnPrimary} flex-1 justify-center`}
            >
              {strikeSaving && <Spinner size={4} />}
              {t.admin.strikeModalSubmit}
            </button>
            <button onClick={() => setStrikeModal(false)} className={`${btnOutline} flex-1 justify-center`}>
              {t.common.cancel}
            </button>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
