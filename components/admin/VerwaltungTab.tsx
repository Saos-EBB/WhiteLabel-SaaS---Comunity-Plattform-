'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle, Check, ChevronDown, Eye, EyeOff, Plus,
} from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import { Divider } from './shared/Divider'
import { Spinner } from './shared/Spinner'
import { Pagination } from './shared/Pagination'
import { ModalOverlay } from './shared/ModalOverlay'
import { btnPrimary, btnOutline, inputCls, fmtDate } from './shared/utils'
import type { AdminEntry, DashboardStats, SystemSetting, Paginated } from './shared/types'

interface Props {
  showToast: (msg: string, ok?: boolean) => void
  isOwner: boolean
}

export function VerwaltungTab({ showToast, isOwner }: Props) {
  const { t } = useTranslation()

  const [verwaltungAdminsOpen, setVerwaltungAdminsOpen] = useState(true)
  const [verwaltungSettingsOpen, setVerwaltungSettingsOpen] = useState(false)
  const [verwaltungPricesOpen, setVerwaltungPricesOpen] = useState(false)
  const [verwaltungDashboardOpen, setVerwaltungDashboardOpen] = useState(false)

  const [priceInputs, setPriceInputs] = useState({ monthly: '', yearly: '', lifetime: '' })
  const [priceSaving, setPriceSaving] = useState(false)
  const [priceConfirmOpen, setPriceConfirmOpen] = useState(false)
  const [priceStatus, setPriceStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const [verwaltungAdmins, setVerwaltungAdmins] = useState<Paginated<AdminEntry> | null>(null)
  const [verwaltungAdminsPage, setVerwaltungAdminsPage] = useState(1)
  const [verwaltungAdminsLoading, setVerwaltungAdminsLoading] = useState(false)
  const [promoteInput, setPromoteInput] = useState('')
  const [promoteLoading, setPromoteLoading] = useState(false)

  const [createAdminEmail, setCreateAdminEmail] = useState('')
  const [createAdminNickname, setCreateAdminNickname] = useState('')
  const [createAdminPassword, setCreateAdminPassword] = useState('')
  const [createAdminPwVisible, setCreateAdminPwVisible] = useState(false)
  const [createAdminLoading, setCreateAdminLoading] = useState(false)
  const [createAdminResult, setCreateAdminResult] = useState<{ nickname: string; public_id: string } | null>(null)
  const [createAdminError, setCreateAdminError] = useState<string | null>(null)

  const [allSettings, setAllSettings] = useState<SystemSetting[]>([])
  const [allSettingsLoading, setAllSettingsLoading] = useState(false)
  const [settingEdits, setSettingEdits] = useState<Record<string, string>>({})
  const [settingRowSaving, setSettingRowSaving] = useState<Set<string>>(new Set())
  const [settingRowStatus, setSettingRowStatus] = useState<Record<string, { ok: boolean; msg: string }>>({})

  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [dashboardStatsLoading, setDashboardStatsLoading] = useState(false)
  const dashboardStatsLoadedOnce = useRef(false)

  async function loadVerwaltungAdmins(page = verwaltungAdminsPage) {
    setVerwaltungAdminsLoading(true)
    try {
      const data = await fetchApi<Paginated<AdminEntry>>(`/admin/admins?page=${page}&limit=20`)
      setVerwaltungAdmins(data)
      setVerwaltungAdminsPage(page)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.admin.loadError, false)
    } finally {
      setVerwaltungAdminsLoading(false)
    }
  }

  async function loadVerwaltungSettings() {
    setAllSettingsLoading(true)
    try {
      const data = await fetchApi<SystemSetting[]>('/admin/settings')
      setAllSettings(data)
      const edits: Record<string, string> = {}
      data.forEach((s) => { edits[s.key] = s.value })
      setSettingEdits(edits)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.admin.loadError, false)
    } finally {
      setAllSettingsLoading(false)
    }
  }

  async function saveSettingRow(key: string) {
    const value = settingEdits[key]
    if (value === undefined) return
    setSettingRowSaving((s) => { const n = new Set(s); n.add(key); return n })
    setSettingRowStatus((s) => { const n = { ...s }; delete n[key]; return n })
    try {
      await fetchApi<unknown>(`/admin/settings/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        body: JSON.stringify({ value }),
      })
      setSettingRowStatus((s) => ({ ...s, [key]: { ok: true, msg: t.common.saved } }))
      await loadVerwaltungSettings()
    } catch (err) {
      setSettingRowStatus((s) => ({ ...s, [key]: { ok: false, msg: err instanceof Error ? err.message : t.common.error } }))
    } finally {
      setSettingRowSaving((s) => { const n = new Set(s); n.delete(key); return n })
    }
  }

  async function promoteByNickname() {
    const query = promoteInput.trim()
    if (!query) return
    setPromoteLoading(true)
    try {
      const res = await fetchApi<Paginated<{ id: string; nickname: string | null }>>(`/admin/users?search=${encodeURIComponent(query)}&limit=20`)
      const exact = res.data.find((u) => u.nickname?.toLowerCase() === query.toLowerCase())
      if (!exact) throw new Error(t.admin.toastUserNotFound)
      await fetchApi<unknown>(`/admin/users/${exact.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: 'admin' }),
      })
      setPromoteInput('')
      showToast(t.admin.toastPromoted.replace('{nickname}', exact.nickname ?? exact.id.slice(0, 8)))
      await loadVerwaltungAdmins(1)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.common.error, false)
    } finally {
      setPromoteLoading(false)
    }
  }

  async function demoteAdmin(userId: string, nickname: string | null) {
    try {
      await fetchApi<unknown>(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: 'user' }),
      })
      showToast(t.admin.toastDemoted.replace('{nickname}', nickname ?? userId.slice(0, 8)))
      await loadVerwaltungAdmins(verwaltungAdminsPage)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.common.error, false)
    }
  }

  async function createAdminAccount() {
    setCreateAdminLoading(true)
    setCreateAdminError(null)
    setCreateAdminResult(null)
    try {
      const res = await fetchApi<{ id: string; nickname: string; public_id: string }>('/admin/users/create', {
        method: 'POST',
        body: JSON.stringify({
          email: createAdminEmail.trim(),
          nickname: createAdminNickname.trim(),
          password: createAdminPassword,
        }),
      })
      setCreateAdminResult({ nickname: res.nickname, public_id: res.public_id })
      setCreateAdminEmail('')
      setCreateAdminNickname('')
      setCreateAdminPassword('')
      setCreateAdminPwVisible(false)
      await loadVerwaltungAdmins(1)
    } catch (err) {
      setCreateAdminError(err instanceof Error ? err.message : t.common.error)
    } finally {
      setCreateAdminLoading(false)
    }
  }

  async function loadDashboardStats() {
    setDashboardStatsLoading(true)
    try {
      const data = await fetchApi<DashboardStats>('/admin/dashboard/stats')
      setDashboardStats(data)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.admin.loadError, false)
    } finally {
      setDashboardStatsLoading(false)
    }
  }

  async function savePrices() {
    setPriceSaving(true)
    setPriceStatus(null)
    try {
      await fetchApi<{ monthly: string; yearly: string; lifetime: string }>('/system-settings/prices', {
        method: 'PATCH',
        body: JSON.stringify(priceInputs),
      })
      setPriceStatus({ ok: true, msg: t.common.saved })
      setPriceConfirmOpen(false)
    } catch (err) {
      setPriceStatus({ ok: false, msg: err instanceof Error ? err.message : t.common.error })
      setPriceConfirmOpen(false)
    } finally {
      setPriceSaving(false)
    }
  }

  useEffect(() => {
    void loadVerwaltungAdmins(1)
    void loadVerwaltungSettings()
    if (isOwner) {
      fetchApi<{ monthly: string; yearly: string; lifetime: string }>('/system-settings/prices')
        .then((data) => setPriceInputs(data))
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5 space-y-2">

      {/* Accordion: Dashboard */}
      <div>
        <div
          role="button"
          aria-expanded={verwaltungDashboardOpen}
          onClick={() => {
            const opening = !verwaltungDashboardOpen
            setVerwaltungDashboardOpen(opening)
            if (opening && !dashboardStatsLoadedOnce.current) {
              dashboardStatsLoadedOnce.current = true
              void loadDashboardStats()
            }
          }}
          className="w-full flex items-center justify-between py-2 cursor-pointer select-none"
        >
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Dashboard</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void loadDashboardStats() }}
              disabled={dashboardStatsLoading}
              className="text-xs text-on-surface-variant hover:text-on-surface underline disabled:opacity-50"
            >
              {dashboardStatsLoading ? <Spinner size={3} /> : 'Aktualisieren'}
            </button>
            <ChevronDown
              className={`h-4 w-4 text-on-surface-variant transition-transform ${verwaltungDashboardOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </div>
        </div>

        {verwaltungDashboardOpen && (
          <div className="pt-3 space-y-2">
            {dashboardStatsLoading && !dashboardStats ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div key={i} className="rounded-xl bg-surface-container-high border border-outline-variant p-3 space-y-1.5 animate-pulse">
                    <div className="h-3 w-16 rounded bg-outline-variant/60" />
                    <div className="h-6 w-10 rounded bg-outline-variant/40" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {([
                    { label: 'Nutzer gesamt', value: dashboardStats?.totalUsers },
                    { label: 'Aktiv',         value: dashboardStats?.activeUsers },
                    { label: 'Gesperrt',      value: dashboardStats?.bannedUsers },
                    { label: 'Neu heute',     value: dashboardStats?.newUsersToday },
                  ] as const).map(({ label, value }) => (
                    <div key={label} className="rounded-xl bg-surface-container-high border border-outline-variant p-3">
                      <p className="text-xs text-on-surface-variant truncate">{label}</p>
                      <p className="text-xl font-bold text-on-surface tabular-nums mt-0.5">
                        {value?.toLocaleString('de-DE') ?? '—'}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {([
                    { label: 'Online jetzt',       value: dashboardStats?.onlineUsers },
                    { label: 'Nachrichten heute',  value: dashboardStats?.messagesToday },
                    { label: 'Anfragen heute',     value: dashboardStats?.contactRequestsToday },
                    { label: 'Neu diese Woche',    value: dashboardStats?.newUsersThisWeek },
                  ] as const).map(({ label, value }) => (
                    <div key={label} className="rounded-xl bg-surface-container-high border border-outline-variant p-3">
                      <p className="text-xs text-on-surface-variant truncate">{label}</p>
                      <p className="text-xl font-bold text-on-surface tabular-nums mt-0.5">
                        {value?.toLocaleString('de-DE') ?? '—'}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {([
                    { label: 'Aktive Abos',           value: dashboardStats?.activeSubscriptions?.toLocaleString('de-DE') },
                    { label: 'Umsatz gesamt (€)',      value: dashboardStats?.totalRevenue != null ? dashboardStats.totalRevenue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : undefined },
                    { label: 'Neue Abos diese Woche', value: dashboardStats?.newUsersThisWeek?.toLocaleString('de-DE') },
                  ] as const).map(({ label, value }) => (
                    <div key={label} className="rounded-xl bg-surface-container-high border border-outline-variant p-3">
                      <p className="text-xs text-on-surface-variant truncate">{label}</p>
                      <p className="text-xl font-bold text-on-surface tabular-nums mt-0.5">{value ?? '—'}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {([
                    { label: 'Offene Meldungen',    value: dashboardStats?.openReports },
                    { label: 'Strikes diese Woche', value: dashboardStats?.strikesThisWeek },
                    { label: 'Offene Tickets',      value: dashboardStats?.openTickets },
                  ] as const).map(({ label, value }) => (
                    <div key={label} className="rounded-xl bg-surface-container-high border border-outline-variant p-3">
                      <p className="text-xs text-on-surface-variant truncate">{label}</p>
                      <p className="text-xl font-bold text-on-surface tabular-nums mt-0.5">
                        {value?.toLocaleString('de-DE') ?? '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Divider />

      {/* Accordion: Admins */}
      <div>
        <div
          role="button"
          aria-expanded={verwaltungAdminsOpen}
          onClick={() => setVerwaltungAdminsOpen((v) => !v)}
          className="w-full flex items-center justify-between py-2 cursor-pointer select-none"
        >
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
            {t.admin.managementAdmins}{verwaltungAdmins ? ` (${verwaltungAdmins.total})` : ''}
          </p>
          <ChevronDown className={`h-4 w-4 text-on-surface-variant transition-transform ${verwaltungAdminsOpen ? 'rotate-180' : ''}`} />
        </div>

        {verwaltungAdminsOpen && (
          <div className="pt-3 space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={promoteInput}
                onChange={(e) => setPromoteInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void promoteByNickname() } }}
                placeholder={t.admin.nicknamePlaceholder}
                disabled={promoteLoading}
                className={inputCls}
              />
              <button
                onClick={() => void promoteByNickname()}
                disabled={promoteLoading || !promoteInput.trim()}
                className={`${btnPrimary} flex-shrink-0`}
              >
                {promoteLoading ? <Spinner size={4} /> : <Plus className="h-4 w-4" />}
                <span className="hidden sm:inline">{t.admin.managementPromote}</span>
              </button>
            </div>

            <Divider />
            <div className="space-y-3">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                {t.admin.managementCreateAdmin}
              </p>
              <input
                type="email"
                value={createAdminEmail}
                onChange={(e) => setCreateAdminEmail(e.target.value)}
                placeholder="E-Mail"
                disabled={createAdminLoading}
                className={inputCls}
              />
              <input
                type="text"
                value={createAdminNickname}
                onChange={(e) => setCreateAdminNickname(e.target.value)}
                placeholder="Nickname"
                disabled={createAdminLoading}
                className={inputCls}
              />
              <div className="relative">
                <input
                  type={createAdminPwVisible ? 'text' : 'password'}
                  value={createAdminPassword}
                  onChange={(e) => setCreateAdminPassword(e.target.value)}
                  placeholder={t.admin.managementPasswordPlaceholder}
                  disabled={createAdminLoading}
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setCreateAdminPwVisible((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                  aria-label={createAdminPwVisible ? t.common.hidePassword : t.common.showPassword}
                  tabIndex={-1}
                >
                  {createAdminPwVisible
                    ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                    : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              {createAdminError && (
                <div className="flex items-center gap-2 text-error text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {createAdminError}
                </div>
              )}
              {createAdminResult && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary-fixed-dim/20 text-on-primary-container text-sm">
                  <Check className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">{createAdminResult.nickname}</span>
                    {' '}{t.admin.managementCreatedId} <span className="font-mono">{createAdminResult.public_id}</span>
                  </span>
                </div>
              )}
              <button
                onClick={() => void createAdminAccount()}
                disabled={createAdminLoading || !createAdminEmail.trim() || !createAdminNickname.trim() || createAdminPassword.length < 8}
                className={btnPrimary}
              >
                {createAdminLoading ? <Spinner size={4} /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                {t.admin.managementCreateAdminButton}
              </button>
            </div>
            <Divider />

            {verwaltungAdminsLoading ? (
              <div className="flex justify-center py-4"><Spinner size={5} /></div>
            ) : verwaltungAdmins && verwaltungAdmins.data.length > 0 ? (
              <div className="space-y-2">
                {verwaltungAdmins.data.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-high p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-on-surface truncate">{a.nickname ?? '—'}</p>
                      <p className="text-xs text-on-surface-variant font-mono">{a.id.slice(0, 8)}</p>
                      <p className="text-xs text-on-surface-variant">{fmtDate(a.created_at)}</p>
                    </div>
                    <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-primary-fixed-dim text-on-primary-container text-xs font-semibold">
                      admin
                    </span>
                    <button
                      onClick={() => void demoteAdmin(a.id, a.nickname)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full border border-outline-variant text-on-surface-variant text-xs font-medium hover:bg-surface-container transition-colors min-h-[36px]"
                    >
                      {t.admin.managementDemote}
                    </button>
                  </div>
                ))}
                <Pagination
                  page={verwaltungAdmins.page}
                  total={verwaltungAdmins.total}
                  limit={verwaltungAdmins.limit}
                  onPage={(p) => void loadVerwaltungAdmins(p)}
                />
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant text-center py-4">{t.admin.managementNoAdmins}</p>
            )}
          </div>
        )}
      </div>

      <Divider />

      {/* Accordion: System-Einstellungen */}
      <div>
        <div
          role="button"
          aria-expanded={verwaltungSettingsOpen}
          onClick={() => setVerwaltungSettingsOpen((v) => !v)}
          className="w-full flex items-center justify-between py-2 cursor-pointer select-none"
        >
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
            {t.admin.managementSettings}
          </p>
          <ChevronDown className={`h-4 w-4 text-on-surface-variant transition-transform ${verwaltungSettingsOpen ? 'rotate-180' : ''}`} />
        </div>

        {verwaltungSettingsOpen && (
          <div className="pt-3">
            {allSettingsLoading ? (
              <div className="flex justify-center py-4"><Spinner size={5} /></div>
            ) : allSettings.length > 0 ? (
              <div className="space-y-2">
                {allSettings
                  .filter((s) => !['subscription_price_monthly', 'subscription_price_yearly', 'subscription_price_lifetime'].includes(s.key))
                  .map((s) => (
                    <div key={s.key} className="rounded-xl border border-outline-variant bg-surface-container-high p-3 space-y-2">
                      <p className="text-xs font-mono text-on-surface-variant">{s.key}</p>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={settingEdits[s.key] ?? s.value}
                          onChange={(e) => setSettingEdits((prev) => ({ ...prev, [s.key]: e.target.value }))}
                          className={`${inputCls} flex-1`}
                          aria-label={s.key}
                        />
                        <button
                          onClick={() => void saveSettingRow(s.key)}
                          disabled={settingRowSaving.has(s.key)}
                          className={`${btnPrimary} flex-shrink-0`}
                        >
                          {settingRowSaving.has(s.key) && <Spinner size={4} />}
                          {t.common.save}
                        </button>
                      </div>
                      {settingRowStatus[s.key] && (
                        <p className={`text-xs ${settingRowStatus[s.key].ok ? 'text-on-surface-variant' : 'text-error'}`}>
                          {settingRowStatus[s.key].msg}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant text-center py-4">{t.admin.managementNoSettings}</p>
            )}
          </div>
        )}
      </div>

      <Divider />

      {/* Accordion: Abonnement-Preise */}
      <div>
        <div
          role="button"
          aria-expanded={verwaltungPricesOpen}
          onClick={() => setVerwaltungPricesOpen((v) => !v)}
          className="w-full flex items-center justify-between py-2 cursor-pointer select-none"
        >
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
            Abonnement-Preise
          </p>
          <ChevronDown className={`h-4 w-4 text-on-surface-variant transition-transform ${verwaltungPricesOpen ? 'rotate-180' : ''}`} />
        </div>

        {verwaltungPricesOpen && (
          <div className="pt-3 space-y-4">
            {([
              { key: 'monthly',  label: 'Monatlich',  placeholder: '9.99' },
              { key: 'yearly',   label: 'Jährlich',   placeholder: '49.99' },
              { key: 'lifetime', label: 'Lebenslang', placeholder: '149.99' },
            ] as const).map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <label htmlFor={`price-${key}`} className="text-xs font-medium text-on-surface-variant">
                  {label} (€)
                </label>
                <input
                  id={`price-${key}`}
                  type="text"
                  value={priceInputs[key]}
                  onChange={(e) => setPriceInputs((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className={inputCls}
                />
              </div>
            ))}
            {priceStatus && (
              <p className={`text-xs ${priceStatus.ok ? 'text-on-surface-variant' : 'text-error'}`}>
                {priceStatus.msg}
              </p>
            )}
            <button
              onClick={() => { setPriceStatus(null); setPriceConfirmOpen(true) }}
              disabled={priceSaving}
              className={btnPrimary}
            >
              {priceSaving && <Spinner size={4} />}
              Speichern
            </button>
          </div>
        )}
      </div>

      {priceConfirmOpen && (
        <ModalOverlay title="Preise aktualisieren?" onClose={() => setPriceConfirmOpen(false)}>
          <p className="text-sm text-on-surface-variant">
            Stelle sicher dass die Preise mit Stripe übereinstimmen.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              onClick={() => void savePrices()}
              disabled={priceSaving}
              className={`${btnPrimary} flex-1 justify-center`}
            >
              {priceSaving && <Spinner size={4} />}
              {t.common.confirm}
            </button>
            <button onClick={() => setPriceConfirmOpen(false)} className={`${btnOutline} flex-1 justify-center`}>
              {t.common.cancel}
            </button>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
