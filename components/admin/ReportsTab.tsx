'use client'

import { useEffect, useState } from 'react'
import { Ban, Check } from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import { Divider } from './shared/Divider'
import { Spinner } from './shared/Spinner'
import { Pagination } from './shared/Pagination'
import { fmtDate } from './shared/utils'
import type { AdminReport, BanInfo, Paginated } from './shared/types'

interface Props {
  showToast: (msg: string, ok?: boolean) => void
  onBanOpen: (info: BanInfo) => void
  usersBanMap: Record<string, { is_banned: boolean; ban_reason: string | null }>
  banTrigger: number
}

export function ReportsTab({ showToast, onBanOpen, usersBanMap, banTrigger }: Props) {
  const { t } = useTranslation()

  const [reports, setReports] = useState<Paginated<AdminReport> | null>(null)
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportPage, setReportPage] = useState(1)
  const [reportEdits, setReportEdits] = useState<Record<string, { status: string; note: string }>>({})
  const [reportSaving, setReportSaving] = useState<Set<string>>(new Set())

  const [historyMode, setHistoryMode] = useState(false)
  const [historyReports, setHistoryReports] = useState<AdminReport[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  async function loadReports(page = reportPage) {
    setReportsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', status: 'open' })
      const data = await fetchApi<Paginated<AdminReport>>(`/admin/reports?${params}`)
      setReports(data)
      setReportPage(page)
      const edits: Record<string, { status: string; note: string }> = {}
      data.data.forEach((r) => { edits[r.id] = { status: r.status, note: r.note ?? '' } })
      setReportEdits(edits)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.admin.loadError, false)
    } finally {
      setReportsLoading(false)
    }
  }

  async function loadHistory() {
    setHistoryLoading(true)
    try {
      const [reviewed, closed] = await Promise.all([
        fetchApi<Paginated<AdminReport>>('/admin/reports?status=reviewed&page=1&limit=100'),
        fetchApi<Paginated<AdminReport>>('/admin/reports?status=closed&page=1&limit=100'),
      ])
      const merged = [...reviewed.data, ...closed.data].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      setHistoryReports(merged)
      const edits: Record<string, { status: string; note: string }> = {}
      merged.forEach((r) => { edits[r.id] = { status: r.status, note: r.note ?? '' } })
      setReportEdits((prev) => ({ ...prev, ...edits }))
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.admin.loadError, false)
    } finally {
      setHistoryLoading(false)
    }
  }

  function openHistory() {
    setHistoryMode(true)
    void loadHistory()
  }

  function closeHistory() {
    setHistoryMode(false)
  }

  async function saveReport(id: string) {
    const edit = reportEdits[id]
    if (!edit) return
    setReportSaving((s) => { const n = new Set(s); n.add(id); return n })
    try {
      await fetchApi<unknown>(`/admin/reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: edit.status, note: edit.note || undefined }),
      })
      showToast(t.admin.toastReportUpdated)
      await loadReports(reportPage)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.common.error, false)
    } finally {
      setReportSaving((s) => { const n = new Set(s); n.delete(id); return n })
    }
  }

  useEffect(() => {
    void loadReports(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (banTrigger > 0) void loadReports(reportPage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banTrigger])

  return (
    <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5 space-y-4">

      <div className="flex items-center gap-2">
        {!historyMode ? (
          <>
            <button
              onClick={() => void loadReports(1)}
              className="px-3 py-2 rounded-xl bg-primary-fixed-dim text-on-primary-container text-sm font-medium hover:opacity-90 transition-opacity min-h-[40px]"
            >
              {t.admin.reportsLoad}
            </button>
            <button
              onClick={openHistory}
              className="px-3 py-2 rounded-xl border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container-high transition-colors min-h-[40px]"
            >
              History
            </button>
          </>
        ) : (
          <button
            onClick={closeHistory}
            className="px-3 py-2 rounded-xl bg-surface-container-high text-on-surface text-sm font-medium hover:bg-surface-container transition-colors min-h-[40px]"
          >
            ← Zurück
          </button>
        )}
      </div>

      <Divider />

      {!historyMode ? (
        reportsLoading ? (
          <div className="flex justify-center py-8"><Spinner size={6} /></div>
        ) : !reports || reports.data.length === 0 ? (
          <p className="text-sm text-on-surface-variant text-center py-8">{t.admin.reportsNone}</p>
        ) : (
          <>
            <div className="space-y-3">
              {reports.data.map((r) => {
              const edit = reportEdits[r.id] ?? { status: r.status, note: r.note ?? '' }
              const saving = reportSaving.has(r.id)
              const closed = r.status === 'closed'
              return (
                <div key={r.id} className="rounded-xl border border-outline-variant bg-surface-container-high p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">
                        {r.reporter_nickname ?? r.reporter_id.slice(0, 8)}
                        <span className="text-on-surface-variant font-normal mx-1">→</span>
                        {r.reported_nickname ?? r.reported_user_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-on-surface-variant">{r.reason}</p>
                      <p className="text-xs text-on-surface-variant">{fmtDate(r.created_at)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.status === 'closed'   ? 'bg-surface-container text-on-surface-variant' :
                        r.status === 'reviewed' ? 'bg-primary-fixed-dim/30 text-on-primary-container' :
                        'bg-error-container text-error'
                      }`}>
                        {r.status}
                      </span>
                      {usersBanMap[r.reported_user_id]?.is_banned &&
                        usersBanMap[r.reported_user_id]?.ban_reason?.startsWith('Automatische Sperre') && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-error-container/50 text-error">{t.admin.usersAutoSuspend}</span>
                      )}
                      <button
                        onClick={() => onBanOpen({ userId: r.reported_user_id, nickname: r.reported_nickname ?? r.reported_user_id.slice(0, 8), reportId: r.id })}
                        className="text-xs px-2 py-1 rounded-full border border-error/40 text-error hover:bg-error-container transition-colors flex items-center gap-1"
                      >
                        <Ban className="h-3 w-3" aria-hidden="true" />
                        {t.admin.usersBan}
                      </button>
                    </div>
                  </div>

                  {!closed && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={edit.status}
                          onChange={(e) => setReportEdits((prev) => ({ ...prev, [r.id]: { ...edit, status: e.target.value } }))}
                          disabled={saving}
                          className="px-2 py-1.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface text-xs focus:outline-none disabled:opacity-50"
                        >
                          <option value="open">open</option>
                          <option value="reviewed">reviewed</option>
                          <option value="closed">closed</option>
                        </select>
                        <button
                          onClick={() => void saveReport(r.id)}
                          disabled={saving}
                          className="px-3 py-1.5 rounded-full bg-primary-fixed-dim text-on-primary-container text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
                        >
                          {saving ? <Spinner size={3} /> : <Check className="h-3 w-3" />}
                          {t.common.save}
                        </button>
                      </div>
                      <textarea
                        value={edit.note}
                        onChange={(e) => setReportEdits((prev) => ({ ...prev, [r.id]: { ...edit, note: e.target.value } }))}
                        placeholder={t.admin.reportsAdminNote}
                        disabled={saving}
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim resize-none disabled:opacity-50"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
              <Pagination page={reports.page} total={reports.total} limit={reports.limit} onPage={(p) => void loadReports(p)} />
            </>
          )
      ) : (
        historyLoading ? (
          <div className="flex justify-center py-8"><Spinner size={6} /></div>
        ) : historyReports.length === 0 ? (
          <p className="text-sm text-on-surface-variant text-center py-8">{t.admin.reportsNone}</p>
        ) : (
          <div className="space-y-3">
            {historyReports.map((r) => {
              const edit = reportEdits[r.id] ?? { status: r.status, note: r.note ?? '' }
              const saving = reportSaving.has(r.id)
              const closed = r.status === 'closed'
              return (
                <div key={r.id} className="rounded-xl border border-outline-variant bg-surface-container-high p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">
                        {r.reporter_nickname ?? r.reporter_id.slice(0, 8)}
                        <span className="text-on-surface-variant font-normal mx-1">→</span>
                        {r.reported_nickname ?? r.reported_user_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-on-surface-variant">{r.reason}</p>
                      <p className="text-xs text-on-surface-variant">{fmtDate(r.created_at)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.status === 'closed'   ? 'bg-surface-container text-on-surface-variant' :
                        r.status === 'reviewed' ? 'bg-primary-fixed-dim/30 text-on-primary-container' :
                        'bg-error-container text-error'
                      }`}>
                        {r.status}
                      </span>
                      {usersBanMap[r.reported_user_id]?.is_banned &&
                        usersBanMap[r.reported_user_id]?.ban_reason?.startsWith('Automatische Sperre') && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-error-container/50 text-error">{t.admin.usersAutoSuspend}</span>
                      )}
                      <button
                        onClick={() => onBanOpen({ userId: r.reported_user_id, nickname: r.reported_nickname ?? r.reported_user_id.slice(0, 8), reportId: r.id })}
                        className="text-xs px-2 py-1 rounded-full border border-error/40 text-error hover:bg-error-container transition-colors flex items-center gap-1"
                      >
                        <Ban className="h-3 w-3" aria-hidden="true" />
                        {t.admin.usersBan}
                      </button>
                    </div>
                  </div>

                  {!closed && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={edit.status}
                          onChange={(e) => setReportEdits((prev) => ({ ...prev, [r.id]: { ...edit, status: e.target.value } }))}
                          disabled={saving}
                          className="px-2 py-1.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface text-xs focus:outline-none disabled:opacity-50"
                        >
                          <option value="open">open</option>
                          <option value="reviewed">reviewed</option>
                          <option value="closed">closed</option>
                        </select>
                        <button
                          onClick={() => void saveReport(r.id)}
                          disabled={saving}
                          className="px-3 py-1.5 rounded-full bg-primary-fixed-dim text-on-primary-container text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
                        >
                          {saving ? <Spinner size={3} /> : <Check className="h-3 w-3" />}
                          {t.common.save}
                        </button>
                      </div>
                      <textarea
                        value={edit.note}
                        onChange={(e) => setReportEdits((prev) => ({ ...prev, [r.id]: { ...edit, note: e.target.value } }))}
                        placeholder={t.admin.reportsAdminNote}
                        disabled={saving}
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim resize-none disabled:opacity-50"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
