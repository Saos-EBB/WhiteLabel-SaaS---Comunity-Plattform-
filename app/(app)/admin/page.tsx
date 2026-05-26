'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle, Ban, BookOpen, Check, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, Crown, Eye, EyeOff, FileText, Image as ImageIcon,
  Inbox, Key, Loader2, Mail, Music, Pause, Play, Plus, Settings, Shield, Trash2, Users, X, Zap,
} from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import BanModal from '@/components/ui/BanModal'
import { useTranslation } from '@/lib/i18n'

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminTab = 'tickets' | 'media' | 'users' | 'reports' | 'strikes' | 'profanity' | 'settings' | 'verwaltung'

interface PendingMedia {
  id: string
  file_url: string
  file_type: string
  uploaded_at: string
  uploaded_by: string
  nickname: string | null
}

type MediaFilter = 'all' | 'image' | 'audio'

interface AdminUser {
  id: string
  role: string
  is_banned: boolean
  ban_reason: string | null
  ban_expires_at: string | null
  is_verified: boolean
  vulnerable_flag: boolean
  created_at: string
  last_login: string | null
  nickname: string | null
  photo_id: string | null
}

interface AdminReport {
  id: string
  status: string
  reason: string
  reporter_id: string
  reported_user_id: string
  reporter_nickname: string | null
  reported_nickname: string | null
  created_at: string
  note: string | null
}

interface AdminStrike {
  id: string
  user_id: string
  type: string
  reason: string
  expires_at: string | null
  ban_lifted_at: string | null
  created_at: string
  user_nickname: string | null
}

interface ProfanityWord {
  word: string
  added_by: string | null
  added_at: string
}

interface SystemSetting {
  key: string
  value: string
  updated_at: string
  updated_by: string | null
}

interface AdminEntry {
  id: string
  role: string
  is_banned: boolean
  is_verified: boolean
  created_at: string
  last_login: string | null
  nickname: string | null
  photo_id: string | null
}

interface AdminTicket {
  id: string
  type: string
  status: string
  source: string | null
  context: {
    email: string
    nickname: string | null
    public_id: string | null
    message: string
  }
  created_at: string
}

interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getJwtRole(token: string | null): string | null {
  if (!token) return null
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const decoded = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string }
    return decoded.role ?? null
  } catch {
    return null
  }
}

function toProxyUrl(url: string): string {
  try { return new URL(url).pathname } catch { return url }
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="h-px bg-outline-variant" />
}

const SPINNER_SIZE: Record<number, string> = { 3: 'h-3 w-3', 4: 'h-4 w-4', 5: 'h-5 w-5', 6: 'h-6 w-6' }

function Spinner({ size = 5 }: { size?: 3 | 4 | 5 | 6 }) {
  return <Loader2 className={`${SPINNER_SIZE[size]} text-on-surface-variant animate-spin`} aria-hidden="true" />
}

function Pagination({
  page, total, limit, onPage,
}: {
  page: number
  total: number
  limit: number
  onPage: (p: number) => void
}) {
  const { t } = useTranslation()
  const pages = Math.ceil(total / limit) || 1
  if (pages <= 1 && total > 0) return (
    <p className="text-xs text-on-surface-variant pt-1">{total} {t.admin.total}</p>
  )
  return (
    <div className="flex items-center justify-between pt-2">
      <span className="text-xs text-on-surface-variant">{total} {t.admin.total}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t.admin.prevPage}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm text-on-surface w-14 text-center">{page} / {pages}</span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t.admin.nextPage}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function ModalOverlay({
  title, onClose, children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <>
      <div
        className="fixed inset-0 z-20 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="fixed bottom-0 left-0 right-0 z-30 rounded-t-2xl bg-surface-container-high border-t border-outline-variant p-6 space-y-4 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:max-w-lg md:w-full"
      >
        <div className="flex items-center justify-between">
          <p id="modal-title" className="font-semibold text-on-surface">{title}</p>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container"
            aria-label={t.common.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </>
  )
}

// ─── Swipe View ───────────────────────────────────────────────────────────────

type SwipeAction = 'approve' | 'reject'

function SwipeView({
  snapshot,
  onApprove,
  onReject,
  onClose,
}: {
  snapshot: PendingMedia[]
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  onClose: () => void
}) {
  const [filter, setFilter] = useState<MediaFilter>('all')
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set())
  const [tilt, setTilt] = useState<'left' | 'right' | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const touchStartX = useRef<number | null>(null)

  const { t } = useTranslation()

  const filteredAll = snapshot.filter((m) => filter === 'all' || m.file_type === filter)
  const filteredPending = filteredAll.filter((m) => !processedIds.has(m.id))
  const current = filteredPending[0] ?? null
  const doneCount = filteredAll.length - filteredPending.length
  const total = filteredAll.length

  // Reset audio when the displayed card changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)
  }, [current?.id])

  function toggleAudio() {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      void audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }

  function processItem(id: string, action: SwipeAction) {
    setProcessedIds((prev) => new Set([...prev, id]))
    setTilt(action === 'approve' ? 'right' : 'left')
    setTimeout(() => setTilt(null), 300)
    if (action === 'approve') void onApprove(id)
    else void onReject(id)
  }

  // Refs hold latest values so the keyboard handler never goes stale
  const latestCurrentId   = useRef<string | null>(null)
  const latestCurrentType = useRef<string | null>(null)
  const latestProcessItem = useRef(processItem)
  const latestToggleAudio = useRef(toggleAudio)
  latestCurrentId.current   = current?.id ?? null
  latestCurrentType.current = current?.file_type ?? null
  latestProcessItem.current = processItem
  latestToggleAudio.current = toggleAudio

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const id = latestCurrentId.current
      if (!id) return
      if (e.key === 'ArrowLeft')  { e.preventDefault(); latestProcessItem.current(id, 'reject') }
      else if (e.key === 'ArrowRight') { e.preventDefault(); latestProcessItem.current(id, 'approve') }
      else if (e.key === ' ' && latestCurrentType.current === 'audio') {
        e.preventDefault()
        latestToggleAudio.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (!current || Math.abs(dx) < 80) return
    processItem(current.id, dx > 0 ? 'approve' : 'reject')
  }

  const cardTransform =
    tilt === 'left'  ? 'rotate(-5deg)' :
    tilt === 'right' ? 'rotate(5deg)'  : 'none'

  return (
    <div className="fixed inset-0 z-[9998] bg-background flex flex-col" role="dialog" aria-modal="true">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant flex-shrink-0">
        <div className="flex gap-1.5">
          {(['all', 'image', 'audio'] as MediaFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-primary-fixed-dim text-on-primary-container'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {f === 'image' && <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />}
              {f === 'audio' && <Music className="h-3.5 w-3.5" aria-hidden="true" />}
              {f === 'all' ? t.admin.swipeAll : f === 'image' ? t.admin.swipePhotos : t.admin.swipeAudio}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {filteredPending.length > 0 && (
            <span className="text-sm text-on-surface-variant tabular-nums">
              {t.admin.swipeProgress.replace('{current}', String(doneCount + 1)).replace('{total}', String(total))}
            </span>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label={t.admin.swipeModeClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!current ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
          <CheckCircle2 className="h-12 w-12" aria-hidden="true" />
          <p className="text-sm">{t.admin.swipeNoPending}</p>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-full border border-outline-variant text-on-surface text-sm hover:bg-surface-container-high transition-colors"
          >
            {t.admin.swipeClose}
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 min-h-0">
          {/* Card row with side arrow buttons */}
          <div className="flex items-center gap-4 w-full max-w-lg">
            <button
              onClick={() => processItem(current.id, 'reject')}
              onMouseEnter={() => setTilt('left')}
              onMouseLeave={() => setTilt(null)}
              className="flex-shrink-0 p-3 rounded-full bg-error-container text-error hover:opacity-90 transition-opacity"
              aria-label={t.admin.swipeReject}
            >
              <ChevronLeft className="h-7 w-7" />
            </button>

            {/* Card */}
            <div
              className="flex-1 rounded-2xl overflow-hidden border border-outline-variant relative select-none"
              style={{ transform: cardTransform, transition: 'transform 0.2s ease' }}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {tilt && (
                <div
                  className="absolute inset-0 z-10 pointer-events-none rounded-2xl"
                  style={{ backgroundColor: tilt === 'left' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)' }}
                />
              )}
              {current.file_type === 'audio' ? (
                <div
                  className="w-full aspect-square bg-surface-container-high flex flex-col items-center justify-center gap-4 p-6 cursor-pointer"
                  onClick={toggleAudio}
                >
                  <Music className="h-16 w-16 text-on-surface-variant" aria-hidden="true" />
                  <p className="text-sm text-on-surface-variant text-center break-all line-clamp-2 px-2">
                    {current.file_url.split('/').pop() ?? current.file_url}
                  </p>
                  <div className="p-3 rounded-full bg-primary-fixed-dim text-on-primary-container">
                    {isPlaying
                      ? <Pause className="h-6 w-6" aria-hidden="true" />
                      : <Play className="h-6 w-6" aria-hidden="true" />}
                  </div>
                  <p className="text-xs text-on-surface-variant/60">{t.admin.swipeSpacePlay}</p>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio
                    ref={audioRef}
                    src={toProxyUrl(current.file_url)}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                    preload="metadata"
                  />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={toProxyUrl(current.file_url)}
                  alt={t.admin.mediaAlt.replace('{nickname}', current.nickname ?? current.uploaded_by)}
                  className="w-full aspect-square object-contain bg-surface-container"
                  draggable={false}
                />
              )}
            </div>

            <button
              onClick={() => processItem(current.id, 'approve')}
              onMouseEnter={() => setTilt('right')}
              onMouseLeave={() => setTilt(null)}
              className="flex-shrink-0 p-3 rounded-full bg-primary-fixed-dim text-on-primary-container hover:opacity-90 transition-opacity"
              aria-label={t.admin.swipeApprove}
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          </div>

          {/* Card metadata */}
          <div className="text-center">
            <p className="text-sm font-medium text-on-surface">
              {current.nickname ?? current.uploaded_by.slice(0, 8)}
            </p>
            <p className="text-xs text-on-surface-variant">{fmtDate(current.uploaded_at)}</p>
          </div>

          {/* Approve / Reject buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => processItem(current.id, 'reject')}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-error-container text-error font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <X className="h-4 w-4" />
              {t.admin.swipeReject}
            </button>
            <button
              onClick={() => processItem(current.id, 'approve')}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <Check className="h-4 w-4" />
              {t.admin.swipeApprove}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { accessToken } = useAuthStore()

  const [activeTab, setActiveTab] = useState<AdminTab>('tickets')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true)
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
      return unsub
    }
  }, [])

  const role = getJwtRole(accessToken)
  const isOwner = role === 'owner'

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return
    if (role !== 'admin' && role !== 'owner') {
      router.replace('/dashboard')
    }
  }, [hydrated, accessToken, role, router])

  useEffect(() => {
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current) }
  }, [])

  function showToast(msg: string, ok = true) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, ok })
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  // ── Media ──────────────────────────────────────────────────────────────────
  const [media, setMedia]             = useState<PendingMedia[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaFilter, setMediaFilter]   = useState<MediaFilter>('all')
  const [rejectModal, setRejectModal]   = useState<{ id: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectSaving, setRejectSaving] = useState(false)
  const [swipeMode, setSwipeMode]           = useState(false)
  const [swipeSnapshot, setSwipeSnapshot]   = useState<PendingMedia[]>([])

  async function loadMedia() {
    setMediaLoading(true)
    try {
      const data = await fetchApi<PendingMedia[]>('/admin/media/pending')
      setMedia(data)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.admin.loadError, false)
    } finally {
      setMediaLoading(false)
    }
  }

  async function approveMedia(id: string) {
    try {
      await fetchApi<void>(`/admin/media/${id}/approve`, { method: 'PATCH' })
      setMedia((prev) => prev.filter((m) => m.id !== id))
      showToast(t.admin.toastMediaApproved)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.common.error, false)
    }
  }

  async function submitRejectMedia() {
    if (!rejectModal || !rejectReason.trim()) return
    setRejectSaving(true)
    try {
      await fetchApi<void>(`/admin/media/${rejectModal.id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      })
      setMedia((prev) => prev.filter((m) => m.id !== rejectModal.id))
      setRejectModal(null)
      setRejectReason('')
      showToast(t.admin.toastMediaRejected)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.common.error, false)
    } finally {
      setRejectSaving(false)
    }
  }

  async function rejectMediaDirect(id: string) {
    try {
      await fetchApi<void>(`/admin/media/${id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: 'Abgelehnt' }),
      })
      setMedia((prev) => prev.filter((m) => m.id !== id))
      showToast(t.admin.toastMediaRejected)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.common.error, false)
    }
  }

  // ── Users ──────────────────────────────────────────────────────────────────
  const [users, setUsers]             = useState<Paginated<AdminUser> | null>(null)
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch]     = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [userBannedFilter, setUserBannedFilter] = useState('')
  const [userPage, setUserPage]         = useState(1)
  const [banModal, setBanModal]         = useState<{ userId: string; nickname: string; reportId?: string } | null>(null)
  const [usersBanMap, setUsersBanMap]   = useState<Record<string, { is_banned: boolean; ban_reason: string | null }>>({})

  const [resetSending, setResetSending]     = useState<Set<string>>(new Set())
  const [resetSent, setResetSent]           = useState<Set<string>>(new Set())
  const [emailChangeModal, setEmailChangeModal] = useState<{ userId: string; nickname: string } | null>(null)
  const [emailChangeValue, setEmailChangeValue] = useState('')
  const [emailChangeSaving, setEmailChangeSaving] = useState(false)
  const [emailChangeError, setEmailChangeError]   = useState<string | null>(null)


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
      setUsersBanMap((prev) => {
        const next = { ...prev }
        data.data.forEach((u) => { next[u.id] = { is_banned: u.is_banned, ban_reason: u.ban_reason } })
        return next
      })
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

  // ── Tickets ────────────────────────────────────────────────────────────────
  const [tickets, setTickets]           = useState<AdminReport[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [ticketsExpanded, setTicketsExpanded] = useState(false)
  const [supportExpanded, setSupportExpanded] = useState(false)

  async function loadTickets() {
    setTicketsLoading(true)
    try {
      const data = await fetchApi<Paginated<AdminReport>>('/admin/reports?status=open&limit=50&page=1')
      const sorted = [...data.data].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      setTickets(sorted)
      if (sorted.length > 0) setTicketsExpanded(true)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.admin.loadError, false)
    } finally {
      setTicketsLoading(false)
    }
  }

  const [supportTickets, setSupportTickets]           = useState<AdminTicket[]>([])
  const [supportTicketsLoading, setSupportTicketsLoading] = useState(false)

  async function loadSupportTickets() {
    setSupportTicketsLoading(true)
    try {
      const data = await fetchApi<Paginated<AdminTicket>>('/admin/tickets?type=support_request&limit=50&page=1')
      setSupportTickets(data.data)
      if (data.data.length > 0) setSupportExpanded(true)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.admin.loadError, false)
    } finally {
      setSupportTicketsLoading(false)
    }
  }

  // ── Reports ────────────────────────────────────────────────────────────────
  const [reports, setReports]           = useState<Paginated<AdminReport> | null>(null)
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportStatusFilter, setReportStatusFilter] = useState('')
  const [reportPage, setReportPage]     = useState(1)
  const [reportEdits, setReportEdits]   = useState<Record<string, { status: string; note: string }>>({})
  const [reportSaving, setReportSaving] = useState<Set<string>>(new Set())

  async function loadReports(page = reportPage) {
    setReportsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (reportStatusFilter) params.set('status', reportStatusFilter)
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

  // ── Strikes ────────────────────────────────────────────────────────────────
  const [strikes, setStrikes]           = useState<Paginated<AdminStrike> | null>(null)
  const [strikesLoading, setStrikesLoading] = useState(false)
  const [strikePage, setStrikePage]     = useState(1)
  const [strikeModal, setStrikeModal]   = useState(false)
  const [strikeUserId, setStrikeUserId] = useState('')
  const [strikeType, setStrikeType]     = useState<'warning' | 'temp' | 'permanent'>('warning')
  const [strikeReason, setStrikeReason] = useState('')
  const [strikeExpires, setStrikeExpires] = useState('')
  const [strikeSaving, setStrikeSaving]           = useState(false)
  const [strikeListSearch, setStrikeListSearch]       = useState('')
  const [strikeListSearchActive, setStrikeListSearchActive] = useState('')
  const strikeListSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [strikeNicknameQuery, setStrikeNicknameQuery] = useState('')
  const [strikeSearchResults, setStrikeSearchResults] = useState<AdminUser[]>([])
  const [strikeSearchLoading, setStrikeSearchLoading] = useState(false)
  const strikeSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // ── Profanity ──────────────────────────────────────────────────────────────
  const [profanity, setProfanity]         = useState<ProfanityWord[]>([])
  const [profanityLoading, setProfanityLoading] = useState(false)
  const [addWord, setAddWord]             = useState('')
  const [addWordSaving, setAddWordSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteSaving, setDeleteSaving]   = useState(false)

  async function loadProfanity() {
    setProfanityLoading(true)
    try {
      const data = await fetchApi<ProfanityWord[]>('/admin/profanity')
      setProfanity(data)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.admin.loadError, false)
    } finally {
      setProfanityLoading(false)
    }
  }

  async function submitAddWord() {
    if (!addWord.trim()) return
    setAddWordSaving(true)
    try {
      await fetchApi<void>('/admin/profanity', {
        method: 'POST',
        body: JSON.stringify({ word: addWord.trim() }),
      })
      setAddWord('')
      showToast(t.admin.toastWordAdded)
      await loadProfanity()
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.common.error, false)
    } finally {
      setAddWordSaving(false)
    }
  }

  async function submitDeleteWord() {
    if (!deleteConfirm) return
    setDeleteSaving(true)
    try {
      await fetchApi<void>(`/admin/profanity/${encodeURIComponent(deleteConfirm)}`, { method: 'DELETE' })
      setDeleteConfirm(null)
      showToast(t.admin.toastWordRemoved)
      await loadProfanity()
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.common.error, false)
    } finally {
      setDeleteSaving(false)
    }
  }

  // ── Settings ───────────────────────────────────────────────────────────────
  const [settingsLoading, setSettingsLoading]       = useState(false)
  const [settingsSaving, setSettingsSaving]         = useState(false)
  const [autoSuspendThreshold, setAutoSuspendThreshold] = useState('10')

  // ── Verwaltung (owner only) ────────────────────────────────────────────────
  const [verwaltungAdminsOpen, setVerwaltungAdminsOpen]     = useState(true)
  const [verwaltungSettingsOpen, setVerwaltungSettingsOpen] = useState(false)
  const [verwaltungPricesOpen, setVerwaltungPricesOpen]     = useState(false)

  const [priceInputs, setPriceInputs]           = useState({ monthly: '', yearly: '', lifetime: '' })
  const [priceSaving, setPriceSaving]           = useState(false)
  const [priceConfirmOpen, setPriceConfirmOpen] = useState(false)
  const [priceStatus, setPriceStatus]           = useState<{ ok: boolean; msg: string } | null>(null)

  const [verwaltungAdmins, setVerwaltungAdmins]           = useState<Paginated<AdminEntry> | null>(null)
  const [verwaltungAdminsPage, setVerwaltungAdminsPage]   = useState(1)
  const [verwaltungAdminsLoading, setVerwaltungAdminsLoading] = useState(false)
  const [promoteInput, setPromoteInput]                   = useState('')
  const [promoteLoading, setPromoteLoading]               = useState(false)

  const [createAdminEmail, setCreateAdminEmail]           = useState('')
  const [createAdminNickname, setCreateAdminNickname]     = useState('')
  const [createAdminPassword, setCreateAdminPassword]     = useState('')
  const [createAdminPwVisible, setCreateAdminPwVisible]   = useState(false)
  const [createAdminLoading, setCreateAdminLoading]       = useState(false)
  const [createAdminResult, setCreateAdminResult]         = useState<{ nickname: string; public_id: string } | null>(null)
  const [createAdminError, setCreateAdminError]           = useState<string | null>(null)

  const [allSettings, setAllSettings]           = useState<SystemSetting[]>([])
  const [allSettingsLoading, setAllSettingsLoading] = useState(false)
  const [settingEdits, setSettingEdits]         = useState<Record<string, string>>({})
  const [settingRowSaving, setSettingRowSaving] = useState<Set<string>>(new Set())
  const [settingRowStatus, setSettingRowStatus] = useState<Record<string, { ok: boolean; msg: string }>>({})

  async function loadSettings() {
    setSettingsLoading(true)
    try {
      const data = await fetchApi<SystemSetting[]>('/admin/settings')
      const threshold = data.find((s) => s.key === 'auto_suspend_threshold')
      if (threshold) setAutoSuspendThreshold(threshold.value)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.admin.loadError, false)
    } finally {
      setSettingsLoading(false)
    }
  }

  async function saveAutoSuspendThreshold() {
    const val = parseInt(autoSuspendThreshold, 10)
    if (isNaN(val) || val < 1 || val > 100) return
    setSettingsSaving(true)
    try {
      await fetchApi<unknown>('/admin/settings/auto_suspend_threshold', {
        method: 'PATCH',
        body: JSON.stringify({ value: String(val) }),
      })
      showToast(t.admin.toastSettingSaved)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.common.error, false)
    } finally {
      setSettingsSaving(false)
    }
  }

  // ── Verwaltung functions ───────────────────────────────────────────────────

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
      const res = await fetchApi<Paginated<AdminUser>>(`/admin/users?search=${encodeURIComponent(query)}&limit=20`)
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

  // ── Load on tab change ─────────────────────────────────────────────────────
  useEffect(() => {
    if (role !== 'admin' && role !== 'owner') return
    if (activeTab === 'tickets')     { loadTickets(); loadSupportTickets() }
    if (activeTab === 'media')       loadMedia()
    if (activeTab === 'users')       loadUsers(1)
    if (activeTab === 'reports')     loadReports(1)
    if (activeTab === 'strikes')     loadStrikes(1)
    if (activeTab === 'profanity')   loadProfanity()
    if (activeTab === 'settings')    loadSettings()
    if (activeTab === 'verwaltung')  { void loadVerwaltungAdmins(1); void loadVerwaltungSettings() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    if (!hydrated || !isOwner) return
    fetchApi<{ monthly: string; yearly: string; lifetime: string }>('/system-settings/prices')
      .then((data) => setPriceInputs(data))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, isOwner])

  // ── Tab definitions ────────────────────────────────────────────────────────
  const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'tickets',   label: t.admin.tabTickets,   icon: <Inbox className="h-4 w-4" /> },
    { key: 'media',     label: t.admin.tabMedia,     icon: <ImageIcon className="h-4 w-4" /> },
    { key: 'users',     label: t.admin.tabUsers,     icon: <Users className="h-4 w-4" /> },
    { key: 'reports',   label: t.admin.tabReports,   icon: <FileText className="h-4 w-4" /> },
    { key: 'strikes',   label: t.admin.tabStrikes,   icon: <Zap className="h-4 w-4" /> },
    { key: 'profanity', label: t.admin.tabProfanity, icon: <BookOpen className="h-4 w-4" /> },
    ...(isOwner
      ? [{ key: 'verwaltung' as AdminTab, label: t.admin.tabManagement, icon: <Crown className="h-4 w-4" /> }]
      : []
    ),
  ]

  const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim transition-colors min-h-[44px]'
  const btnPrimary = 'px-4 py-2.5 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-sm min-h-[44px] hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const btnOutline = 'px-4 py-2.5 rounded-full border border-outline-variant text-on-surface font-semibold text-sm min-h-[44px] hover:bg-surface-container transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-background pb-24 md:pb-8">

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium pointer-events-none ${
            toast.ok
              ? 'bg-surface-container-high text-on-surface'
              : 'bg-error-container text-error'
          }`}
        >
          {toast.ok
            ? <Check className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            : <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">

        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-on-surface-variant" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-on-surface">Admin</h1>
          {isOwner && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              <Crown className="h-3 w-3" aria-hidden="true" />
              Owner
            </span>
          )}
        </div>

        {/* Tab bar */}
        <div className="rounded-2xl bg-surface-container border border-outline-variant p-1 flex gap-1 overflow-x-auto">
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              aria-pressed={activeTab === key}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                activeTab === key
                  ? 'bg-primary-fixed-dim text-on-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab: Tickets ──────────────────────────────────────────────────── */}
        {activeTab === 'tickets' && (
          <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5 space-y-2">

            {/* ── Accordion: Meldungen ────────────────────────────────────── */}
            <div>
              <div
                role="button"
                aria-expanded={ticketsExpanded}
                onClick={() => setTicketsExpanded((v) => !v)}
                className="w-full flex items-center justify-between py-2 cursor-pointer select-none"
              >
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                  {t.admin.ticketsReports.replace('{count}', String(tickets.length))}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); loadTickets() }}
                    className="text-xs text-on-surface-variant hover:text-on-surface underline"
                  >
                    {t.admin.ticketsRefresh}
                  </button>
                  <ChevronDown
                    className={`h-4 w-4 text-on-surface-variant transition-transform duration-300 ${ticketsExpanded ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </div>
              </div>

              <div className={`grid transition-all duration-300 ease-in-out ${ticketsExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="pt-2 pb-1 space-y-3">
                    <Divider />
                    {ticketsLoading ? (
                      <div className="flex justify-center py-8"><Spinner size={6} /></div>
                    ) : tickets.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-8 text-on-surface-variant">
                        <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                        <p className="text-sm">{t.admin.ticketsNoReports}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {tickets.map((ticket) => (
                          <div
                            key={ticket.id}
                            className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-surface-container-high border border-outline-variant"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <p className="text-sm font-medium text-on-surface truncate">
                                {ticket.reporter_nickname ?? ticket.reporter_id.slice(0, 8)}
                                <span className="text-on-surface-variant font-normal mx-1.5">→</span>
                                {ticket.reported_nickname ?? ticket.reported_user_id.slice(0, 8)}
                              </p>
                              <p className="text-xs text-on-surface-variant">{ticket.reason}</p>
                              <p className="text-xs text-on-surface-variant/60">{fmtDate(ticket.created_at)}</p>
                            </div>
                            <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-error-container text-error">
                              {ticket.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Divider />

            {/* ── Accordion: Support Anfragen ──────────────────────────────── */}
            <div>
              <div
                role="button"
                aria-expanded={supportExpanded}
                onClick={() => setSupportExpanded((v) => !v)}
                className="w-full flex items-center justify-between py-2 cursor-pointer select-none"
              >
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                  {t.admin.ticketsSupportRequests.replace('{count}', String(supportTickets.length))}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); loadSupportTickets() }}
                    className="text-xs text-on-surface-variant hover:text-on-surface underline"
                  >
                    {t.admin.ticketsRefresh}
                  </button>
                  <ChevronDown
                    className={`h-4 w-4 text-on-surface-variant transition-transform duration-300 ${supportExpanded ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </div>
              </div>

              <div className={`grid transition-all duration-300 ease-in-out ${supportExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="pt-2 pb-1 space-y-3">
                    <Divider />
                    {supportTicketsLoading ? (
                      <div className="flex justify-center py-6"><Spinner size={6} /></div>
                    ) : supportTickets.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-6 text-on-surface-variant">
                        <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                        <p className="text-sm">{t.admin.ticketsNoSupport}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {supportTickets.map((stk) => (
                          <div key={stk.id} className="rounded-xl bg-surface-container-high border border-outline-variant p-4 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 space-y-0.5">
                                <p className="text-sm font-medium text-on-surface truncate">{stk.context.email}</p>
                                {(stk.context.nickname || stk.context.public_id) && (
                                  <p className="text-xs text-on-surface-variant">
                                    {[stk.context.nickname, stk.context.public_id].filter(Boolean).join(' · ')}
                                  </p>
                                )}
                                <p className="text-xs text-on-surface-variant/60">{fmtDate(stk.created_at)}</p>
                              </div>
                              <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-error-container text-error">
                                {stk.status}
                              </span>
                            </div>
                            <p className="text-sm text-on-surface whitespace-pre-wrap break-words">{stk.context.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── Tab: Medien ───────────────────────────────────────────────────── */}
        {activeTab === 'media' && (
          <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                {t.admin.mediaPending}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setSwipeSnapshot([...media]); setSwipeMode(true) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-fixed-dim text-on-primary-container text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.admin.mediaSwipeMode}
                </button>
                <button onClick={loadMedia} className="text-xs text-on-surface-variant hover:text-on-surface underline">
                  {t.admin.ticketsRefresh}
                </button>
              </div>
            </div>

            {/* Filter */}
            <div className="flex gap-1.5">
              {(['all', 'image', 'audio'] as MediaFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setMediaFilter(f)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    mediaFilter === f
                      ? 'bg-primary-fixed-dim text-on-primary-container'
                      : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {f === 'image' && <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                  {f === 'audio' && <Music className="h-3.5 w-3.5" aria-hidden="true" />}
                  {f === 'all' ? t.admin.swipeAll : f === 'image' ? t.admin.mediaImages : t.admin.mediaAudio}
                </button>
              ))}
            </div>

            {mediaLoading ? (
              <div className="flex justify-center py-10"><Spinner size={6} /></div>
            ) : media.filter((m) => mediaFilter === 'all' || m.file_type === mediaFilter).length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-on-surface-variant">
                <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
                <p className="text-sm">{t.admin.mediaNoMedia}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {media
                  .filter((m) => mediaFilter === 'all' || m.file_type === mediaFilter)
                  .map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl overflow-hidden border border-outline-variant bg-surface-container-high flex flex-col"
                  >
                    {m.file_type === 'audio' ? (
                      <div className="w-full aspect-square bg-surface-container flex flex-col items-center justify-center gap-2 p-3">
                        <Music className="h-8 w-8 text-on-surface-variant" aria-hidden="true" />
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <audio controls src={toProxyUrl(m.file_url)} className="w-full" />
                      </div>
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={toProxyUrl(m.file_url)}
                        alt={t.admin.mediaAlt.replace('{nickname}', m.nickname ?? m.uploaded_by)}
                        className="w-full aspect-square object-cover"
                      />
                    )}
                    <div className="p-2 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          m.file_type === 'audio'
                            ? 'bg-surface-container text-on-surface-variant'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}>
                          {m.file_type === 'audio' ? t.admin.mediaAudio : t.admin.mediaItem}
                        </span>
                        <p className="text-xs font-medium text-on-surface truncate">
                          {m.nickname ?? m.uploaded_by.slice(0, 8)}
                        </p>
                      </div>
                      <p className="text-xs text-on-surface-variant">{fmtDate(m.uploaded_at)}</p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => approveMedia(m.id)}
                          className="flex-1 py-1.5 rounded-lg bg-primary-fixed-dim text-on-primary-container text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                          aria-label={t.admin.swipeApprove}
                        >
                          <Check className="h-3 w-3" />
                          OK
                        </button>
                        <button
                          onClick={() => { setRejectModal({ id: m.id }); setRejectReason('') }}
                          className="flex-1 py-1.5 rounded-lg bg-error-container text-error text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                          aria-label={t.admin.swipeReject}
                        >
                          <X className="h-3 w-3" />
                          {t.common.no}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Nutzer ───────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5 space-y-4">

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <input
                type="search"
                placeholder={t.admin.usersSearchPlaceholder}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadUsers(1) }}
                className="flex-1 min-w-[160px] px-3 py-2 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim min-h-[40px]"
              />
              <select
                value={userRoleFilter}
                onChange={(e) => { setUserRoleFilter(e.target.value); loadUsers(1) }}
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
                onChange={(e) => { setUserBannedFilter(e.target.value); loadUsers(1) }}
                className="px-3 py-2 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none min-h-[40px]"
                aria-label={t.admin.usersColStatus}
              >
                <option value="">{t.admin.usersFilterAll}</option>
                <option value="true">{t.admin.usersFilterBanned}</option>
                <option value="false">{t.admin.usersFilterActive}</option>
              </select>
              <button
                onClick={() => loadUsers(1)}
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
                              onChange={(e) => setUserRole(u.id, e.target.value)}
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
                                onClick={() => { setEmailChangeModal({ userId: u.id, nickname: u.nickname ?? u.id.slice(0, 8) }); setEmailChangeValue(''); setEmailChangeError(null) }}
                                className="text-xs px-2 py-1.5 rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors flex items-center gap-1"
                                aria-label={t.admin.usersEmailAriaLabel.replace('{nickname}', u.nickname ?? u.id.slice(0, 8))}
                              >
                                <Mail className="h-3 w-3" aria-hidden="true" />
                                {t.admin.usersEmail}
                              </button>
                              {u.is_banned ? (
                                <button
                                  onClick={() => unbanUser(u.id)}
                                  className="text-xs px-2 py-1.5 rounded-full border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors"
                                >
                                  {t.admin.usersUnban}
                                </button>
                              ) : (
                                <button
                                  onClick={() => setBanModal({ userId: u.id, nickname: u.nickname ?? u.id.slice(0, 8) })}
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
                <Pagination page={users.page} total={users.total} limit={users.limit} onPage={(p) => loadUsers(p)} />
              </>
            )}
          </div>
        )}

        {/* ── Tab: Meldungen ────────────────────────────────────────────────── */}
        {activeTab === 'reports' && (
          <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5 space-y-4">

            <div className="flex items-center gap-2">
              <select
                value={reportStatusFilter}
                onChange={(e) => { setReportStatusFilter(e.target.value); loadReports(1) }}
                className="px-3 py-2 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none min-h-[40px]"
                aria-label={t.admin.usersColStatus}
              >
                <option value="">{t.admin.reportsFilterAll}</option>
                <option value="open">{t.admin.reportsFilterOpen}</option>
                <option value="reviewed">{t.admin.reportsFilterReviewed}</option>
                <option value="closed">{t.admin.reportsFilterClosed}</option>
              </select>
              <button
                onClick={() => loadReports(1)}
                className="px-3 py-2 rounded-xl bg-primary-fixed-dim text-on-primary-container text-sm font-medium hover:opacity-90 transition-opacity min-h-[40px]"
              >
                {t.admin.reportsLoad}
              </button>
            </div>

            <Divider />

            {reportsLoading ? (
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
                              onClick={() => setBanModal({ userId: r.reported_user_id, nickname: r.reported_nickname ?? r.reported_user_id.slice(0, 8), reportId: r.id })}
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
                                onClick={() => saveReport(r.id)}
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
                <Pagination page={reports.page} total={reports.total} limit={reports.limit} onPage={(p) => loadReports(p)} />
              </>
            )}
          </div>
        )}

        {/* ── Tab: Strikes ──────────────────────────────────────────────────── */}
        {activeTab === 'strikes' && (
          <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5 space-y-4">

            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">{t.admin.strikesTitle}</p>
              <button
                onClick={() => { setStrikeModal(true); setStrikeUserId(''); setStrikeNicknameQuery(''); setStrikeSearchResults([]); setStrikeType('warning'); setStrikeReason(''); setStrikeExpires('') }}
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
              onChange={(e) => {
                const q = e.target.value
                setStrikeListSearch(q)
                if (strikeListSearchTimer.current) clearTimeout(strikeListSearchTimer.current)
                strikeListSearchTimer.current = setTimeout(() => setStrikeListSearchActive(q), 300)
              }}
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
                      {strikes.data
                        .filter((s) =>
                          !strikeListSearchActive.trim() ||
                          (s.user_nickname ?? '').toLowerCase().includes(strikeListSearchActive.toLowerCase())
                        )
                        .map((s) => (
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
                <Pagination page={strikes.page} total={strikes.total} limit={strikes.limit} onPage={(p) => loadStrikes(p)} />
              </>
            )}
          </div>
        )}

        {/* ── Tab: Schimpfwörter ────────────────────────────────────────────── */}
        {activeTab === 'profanity' && (
          <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5 space-y-4">

            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
              {t.admin.profanityTitle}
            </p>

            {/* Add word */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t.admin.profanityNewWord}
                value={addWord}
                onChange={(e) => setAddWord(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitAddWord() }}
                className="flex-1 px-3 py-2 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim min-h-[40px]"
              />
              <button
                onClick={submitAddWord}
                disabled={addWordSaving || !addWord.trim()}
                className="px-3 py-2 rounded-xl bg-primary-fixed-dim text-on-primary-container text-sm font-medium hover:opacity-90 transition-opacity min-h-[40px] disabled:opacity-50 flex items-center gap-1.5"
              >
                {addWordSaving ? <Spinner size={4} /> : <Plus className="h-4 w-4" />}
                {t.admin.profanityAdd}
              </button>
            </div>

            <Divider />

            {profanityLoading ? (
              <div className="flex justify-center py-8"><Spinner size={6} /></div>
            ) : profanity.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-8">{t.admin.profanityNone}</p>
            ) : (
              <div className="space-y-2">
                {profanity.map((w) => (
                  <div
                    key={w.word}
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-surface-container-high border border-outline-variant"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-mono font-medium text-on-surface">{w.word}</p>
                      <p className="text-xs text-on-surface-variant">
                        {fmtDate(w.added_at)}
                        {w.added_by && ` · ${w.added_by.slice(0, 8)}`}
                      </p>
                    </div>
                    <button
                      onClick={() => setDeleteConfirm(w.word)}
                      className="p-2 rounded-lg text-error hover:bg-error-container transition-colors flex-shrink-0"
                      aria-label={t.admin.profanityRemoveAriaLabel.replace('{word}', w.word)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Verwaltung (owner only) ─────────────────────────────────── */}
        {activeTab === 'verwaltung' && (
          <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5 space-y-2">

            {/* ── Accordion: Admins ───────────────────────────────────────── */}
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
                  {/* Promote */}
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

                  {/* Create admin account */}
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

                  {/* List */}
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

            {/* ── Accordion: System-Einstellungen ─────────────────────── */}
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
                      {allSettings.filter((s) => !['subscription_price_monthly', 'subscription_price_yearly', 'subscription_price_lifetime'].includes(s.key)).map((s) => (
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

            {/* ── Accordion: Abonnement-Preise ─────────────────────────── */}
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

          </div>
        )}

        {/* ── Tab: Einstellungen ────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5 space-y-4">

            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
              {t.admin.managementSettings}
            </p>

            {settingsLoading ? (
              <div className="flex justify-center py-8"><Spinner size={6} /></div>
            ) : (
              <div className="space-y-3">

                {/* Auto-Suspend threshold */}
                <div className="rounded-xl border border-outline-variant bg-surface-container-high p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-on-surface">{t.admin.settingsAutoSuspend}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {t.admin.settingsAutoSuspendDesc}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={autoSuspendThreshold}
                      onChange={(e) => setAutoSuspendThreshold(e.target.value)}
                      className="w-24 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim min-h-[40px]"
                      aria-label={t.admin.settingsAutoSuspend}
                    />
                    <button
                      onClick={saveAutoSuspendThreshold}
                      disabled={settingsSaving || !autoSuspendThreshold || Number(autoSuspendThreshold) < 1 || Number(autoSuspendThreshold) > 100}
                      className={btnPrimary}
                    >
                      {settingsSaving && <Spinner size={4} />}
                      {t.common.save}
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Modal: Bild ablehnen ──────────────────────────────────────────────── */}
      {rejectModal && (
        <ModalOverlay title={t.admin.rejectModalTitle} onClose={() => setRejectModal(null)}>
          <div className="space-y-3">
            <label className="text-sm text-on-surface-variant" htmlFor="reject-reason">{t.admin.rejectModalReasonLabel}</label>
            <textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t.admin.rejectModalReasonPlaceholder}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              onClick={submitRejectMedia}
              disabled={rejectSaving || !rejectReason.trim()}
              className={`${btnPrimary} flex-1 justify-center bg-error-container text-error`}
            >
              {rejectSaving && <Spinner size={4} />}
              {t.admin.swipeReject}
            </button>
            <button onClick={() => setRejectModal(null)} className={`${btnOutline} flex-1 justify-center`}>
              {t.common.cancel}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal: E-Mail ändern ─────────────────────────────────────────────── */}
      {emailChangeModal && (
        <ModalOverlay title={t.admin.emailModalTitle.replace('{nickname}', emailChangeModal.nickname)} onClose={() => setEmailChangeModal(null)}>
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

      {/* ── Modal: Nutzer sperren ─────────────────────────────────────────────── */}
      {banModal && (
        <BanModal
          userId={banModal.userId}
          nickname={banModal.nickname}
          reportId={banModal.reportId}
          onSuccess={() => {
            showToast(t.admin.toastUserBanned)
            if (activeTab === 'users')   void loadUsers(userPage)
            if (activeTab === 'reports') void loadReports(reportPage)
          }}
          onClose={() => setBanModal(null)}
        />
      )}

      {/* ── Modal: Neuer Strike ───────────────────────────────────────────────── */}
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
              onClick={submitStrike}
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

      {/* ── Swipe-Modus overlay ──────────────────────────────────────────────── */}
      {swipeMode && (
        <SwipeView
          snapshot={swipeSnapshot}
          onApprove={approveMedia}
          onReject={rejectMediaDirect}
          onClose={() => setSwipeMode(false)}
        />
      )}

      {/* ── Modal: Wort löschen ───────────────────────────────────────────────── */}
      {deleteConfirm && (
        <ModalOverlay title={t.admin.removeWordTitle} onClose={() => setDeleteConfirm(null)}>
          <p className="text-sm text-on-surface-variant">
            {t.admin.removeWordDesc.split('{word}')[0]}
            <span className="font-mono font-semibold text-on-surface">{deleteConfirm}</span>
            {t.admin.removeWordDesc.split('{word}')[1]}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              onClick={submitDeleteWord}
              disabled={deleteSaving}
              className={`${btnPrimary} flex-1 justify-center bg-error-container text-error`}
            >
              {deleteSaving && <Spinner size={4} />}
              {t.admin.removeWordConfirm}
            </button>
            <button onClick={() => setDeleteConfirm(null)} className={`${btnOutline} flex-1 justify-center`}>
              {t.common.cancel}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal: Preise bestätigen ──────────────────────────────────────────── */}
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

    </main>
  )
}
