'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Ban, Check, Key, Mail } from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import { ModalOverlay } from './shared/ModalOverlay'
import { Divider } from './shared/Divider'
import { Spinner } from './shared/Spinner'
import { Pagination } from './shared/Pagination'
import { btnPrimary, btnOutline, inputCls, fmtDate } from './shared/utils'
import type { AdminUser, BanInfo, Paginated } from './shared/types'

interface Props {
  showToast: (msg: string, ok?: boolean) => void
  onBanOpen: (info: BanInfo) => void
  onBanMapUpdate: (updates: Record<string, { is_banned: boolean; ban_reason: string | null }>) => void
  banTrigger: number
}

export function UsersTab({ showToast, onBanOpen, onBanMapUpdate, banTrigger }: Props) {
  const { t } = useTranslation()

  const [users, setUsers] = useState<Paginated<AdminUser> | null>(null)
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [userBannedFilter, setUserBannedFilter] = useState('')
  const [userPage, setUserPage] = useState(1)

  const [resetSending, setResetSending] = useState<Set<string>>(new Set())
  const [resetSent, setResetSent] = useState<Set<string>>(new Set())

  const [emailChangeModal, setEmailChangeModal] = useState<{ userId: string; nickname: string } | null>(null)
  const [emailChangeValue, setEmailChangeValue] = useState('')
  const [emailChangeSaving, setEmailChangeSaving] = useState(false)
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null)

  async function loadUsers(page = userPage) {
    setUsersLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (userSearch.trim()) params.set('search', userSearch.trim())
      if (userRoleFilter)    params.set('role', userRoleFilter)
      if (userBannedFilter)  params.set('is_banned', userBannedFilter)
      const data = await fetchApi<Paginated<AdminUser>>(`/admin/users?${params}`)
      setUsers(data)
      setUserPage(page)
      const updates: Record<string, { is_banned: boolean; ban_reason: string | null }> = {}
      data.data.forEach((u) => { updates[u.id] = { is_banned: u.is_banned, ban_reason: u.ban_reason } })
      onBanMapUpdate(updates)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.admin.loadError, false)
    } finally {
      setUsersLoading(false)
    }
  }

  async function unbanUser(userId: string) {
    try {
      await fetchApi<void>(`/admin/users/${userId}/unban`, { method: 'PATCH' })
      showToast(t.admin.toastUnbanned)
      await loadUsers(userPage)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.common.error, false)
    }
  }

  async function setUserRole(userId: string, role: string) {
    try {
      await fetchApi<unknown>(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      })
      showToast(t.admin.toastRoleSaved)
      await loadUsers(userPage)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.common.error, false)
    }
  }

  async function sendPasswordReset(userId: string) {
    setResetSending((s) => { const n = new Set(s); n.add(userId); return n })
    try {
      await fetchApi<void>(`/admin/users/${userId}/send-password-reset`, { method: 'POST' })
      setResetSent((s) => { const n = new Set(s); n.add(userId); return n })
      setTimeout(() => {
        setResetSent((s) => { const n = new Set(s); n.delete(userId); return n })
      }, 3000)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.common.error, false)
    } finally {
      setResetSending((s) => { const n = new Set(s); n.delete(userId); return n })
    }
  }

  async function submitEmailChange() {
    if (!emailChangeModal || !emailChangeValue.trim()) return
    setEmailChangeSaving(true)
    setEmailChangeError(null)
    try {
      await fetchApi<void>(`/admin/users/${emailChangeModal.userId}/email`, {
        method: 'PATCH',
        body: JSON.stringify({ new_email: emailChangeValue.trim() }),
      })
      showToast(t.admin.toastEmailUpdated)
      setEmailChangeModal(null)
      setEmailChangeValue('')
    } catch (err) {
      setEmailChangeError(err instanceof Error ? err.message : t.common.error)
    } finally {
      setEmailChangeSaving(false)
    }
  }

  useEffect(() => {
    void loadUsers(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (banTrigger > 0) void loadUsers(userPage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banTrigger])

  return (
    <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5 space-y-4">

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder={t.admin.usersSearchPlaceholder}
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void loadUsers(1) }}
          className="flex-1 min-w-[160px] px-3 py-2 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim min-h-[40px]"
        />
        <select
          value={userRoleFilter}
          onChange={(e) => { setUserRoleFilter(e.target.value); void loadUsers(1) }}
          className="px-3 py-2 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none min-h-[40px]"
          aria-label={t.admin.usersColRole}
        >
          <option value="">{t.admin.usersFilterAllRoles}</option>
          <option value="user">user</option>
          <option value="admin">admin</option>
          <option value="org">org</option>
        </select>
        <select
          value={userBannedFilter}
          onChange={(e) => { setUserBannedFilter(e.target.value); void loadUsers(1) }}
          className="px-3 py-2 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none min-h-[40px]"
          aria-label={t.admin.usersColStatus}
        >
          <option value="">{t.admin.usersFilterAll}</option>
          <option value="true">{t.admin.usersFilterBanned}</option>
          <option value="false">{t.admin.usersFilterActive}</option>
        </select>
        <button
          onClick={() => void loadUsers(1)}
          className="px-3 py-2 rounded-xl bg-primary-fixed-dim text-on-primary-container text-sm font-medium hover:opacity-90 transition-opacity min-h-[40px]"
        >
          {t.admin.usersSearch}
        </button>
      </div>

      <Divider />

      {usersLoading ? (
        <div className="flex justify-center py-8"><Spinner size={6} /></div>
      ) : !users || users.data.length === 0 ? (
        <p className="text-sm text-on-surface-variant text-center py-8">{t.admin.usersNotFound}</p>
      ) : (
        <>
          <div className="overflow-x-auto -mx-4 sm:-mx-5">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">{t.admin.usersColNickname}</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">{t.admin.usersColRole}</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">{t.admin.usersColStatus}</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">{t.admin.usersColCreated}</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-on-surface-variant">{t.admin.usersColActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {users.data.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-container-high/50">
                    <td className="px-4 py-3 font-medium text-on-surface">
                      {u.nickname ?? <span className="text-on-surface-variant italic">—</span>}
                      {u.vulnerable_flag && (
                        <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-error-container text-error">{t.admin.usersVulnerable}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => void setUserRole(u.id, e.target.value)}
                        className="px-2 py-1 rounded-lg bg-transparent border border-outline-variant text-on-surface text-xs focus:outline-none"
                        aria-label={t.admin.usersRoleAriaLabel.replace('{nickname}', u.nickname ?? u.id)}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                        <option value="org">org</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_banned ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-error-container text-error">{t.admin.usersFilterBanned}</span>
                          {u.ban_reason?.startsWith('Automatische Sperre') && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-error-container/50 text-error">{t.admin.usersAutoSuspend}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">{t.admin.usersFilterActive}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant text-xs">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          onClick={() => void sendPasswordReset(u.id)}
                          disabled={resetSending.has(u.id)}
                          className="text-xs px-2 py-1.5 rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={t.admin.usersResetAriaLabel.replace('{nickname}', u.nickname ?? u.id.slice(0, 8))}
                        >
                          {resetSending.has(u.id) ? (
                            <Spinner size={3} />
                          ) : resetSent.has(u.id) ? (
                            <Check className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <Key className="h-3 w-3" aria-hidden="true" />
                          )}
                          {resetSent.has(u.id) ? t.admin.usersSent : t.admin.usersReset}
                        </button>
                        <button
                          onClick={() => {
                            setEmailChangeModal({ userId: u.id, nickname: u.nickname ?? u.id.slice(0, 8) })
                            setEmailChangeValue('')
                            setEmailChangeError(null)
                          }}
                          className="text-xs px-2 py-1.5 rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors flex items-center gap-1"
                          aria-label={t.admin.usersEmailAriaLabel.replace('{nickname}', u.nickname ?? u.id.slice(0, 8))}
                        >
                          <Mail className="h-3 w-3" aria-hidden="true" />
                          {t.admin.usersEmail}
                        </button>
                        {u.is_banned ? (
                          <button
                            onClick={() => void unbanUser(u.id)}
                            className="text-xs px-2 py-1.5 rounded-full border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors"
                          >
                            {t.admin.usersUnban}
                          </button>
                        ) : (
                          <button
                            onClick={() => onBanOpen({ userId: u.id, nickname: u.nickname ?? u.id.slice(0, 8) })}
                            className="text-xs px-2 py-1.5 rounded-full border border-error/40 text-error hover:bg-error-container transition-colors flex items-center gap-1"
                          >
                            <Ban className="h-3 w-3" aria-hidden="true" />
                            {t.admin.usersBan}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={users.page} total={users.total} limit={users.limit} onPage={(p) => void loadUsers(p)} />
        </>
      )}

      {emailChangeModal && (
        <ModalOverlay
          title={t.admin.emailModalTitle.replace('{nickname}', emailChangeModal.nickname)}
          onClose={() => setEmailChangeModal(null)}
        >
          <div className="space-y-3">
            <label className="text-sm text-on-surface-variant block" htmlFor="admin-email-input">
              {t.admin.emailModalLabel}
            </label>
            <input
              id="admin-email-input"
              type="email"
              value={emailChangeValue}
              onChange={(e) => setEmailChangeValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void submitEmailChange() }}
              placeholder="neue@email.de"
              autoFocus
              className={inputCls}
            />
            {emailChangeError && (
              <div className="flex items-center gap-2 text-error text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                {emailChangeError}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              onClick={() => void submitEmailChange()}
              disabled={emailChangeSaving || !emailChangeValue.trim()}
              className={`${btnPrimary} flex-1 justify-center`}
            >
              {emailChangeSaving && <Spinner size={4} />}
              {t.common.save}
            </button>
            <button onClick={() => setEmailChangeModal(null)} className={`${btnOutline} flex-1 justify-center`}>
              {t.common.cancel}
            </button>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
