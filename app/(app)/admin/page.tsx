'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle, Ban, BookOpen, Check, CheckCircle2,
  ChevronLeft, ChevronRight, FileText, Image as ImageIcon,
  Inbox, Loader2, Music, Pause, Play, Plus, Settings, Shield, Trash2, Users, X, Zap,
} from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import BanModal from '@/components/ui/BanModal'

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminTab = 'tickets' | 'media' | 'users' | 'reports' | 'strikes' | 'profanity' | 'settings'

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
  const pages = Math.ceil(total / limit) || 1
  if (pages <= 1 && total > 0) return (
    <p className="text-xs text-on-surface-variant pt-1">{total} Gesamt</p>
  )
  return (
    <div className="flex items-center justify-between pt-2">
      <span className="text-xs text-on-surface-variant">{total} Gesamt</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Vorige Seite"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm text-on-surface w-14 text-center">{page} / {pages}</span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Nächste Seite"
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
            aria-label="Schließen"
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
              {f === 'all' ? 'Alle' : f === 'image' ? 'Fotos' : 'Audio'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {filteredPending.length > 0 && (
            <span className="text-sm text-on-surface-variant tabular-nums">
              {doneCount + 1} von {total}
            </span>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label="Swipe-Modus schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!current ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
          <CheckCircle2 className="h-12 w-12" aria-hidden="true" />
          <p className="text-sm">Keine ausstehenden Medien</p>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-full border border-outline-variant text-on-surface text-sm hover:bg-surface-container-high transition-colors"
          >
            Schließen
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
              aria-label="Ablehnen"
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
                  <p className="text-xs text-on-surface-variant/60">Leertaste zum Abspielen</p>
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
                  alt={`Medium von ${current.nickname ?? current.uploaded_by}`}
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
              aria-label="Freigeben"
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
              Ablehnen
            </button>
            <button
              onClick={() => processItem(current.id, 'approve')}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <Check className="h-4 w-4" />
              Freigeben
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
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

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return
    if (getJwtRole(accessToken) !== 'admin') {
      router.replace('/dashboard')
    }
  }, [hydrated, accessToken, router])

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
      showToast(err instanceof Error ? err.message : 'Fehler beim Laden', false)
    } finally {
      setMediaLoading(false)
    }
  }

  async function approveMedia(id: string) {
    try {
      await fetchApi<void>(`/admin/media/${id}/approve`, { method: 'PATCH' })
      setMedia((prev) => prev.filter((m) => m.id !== id))
      showToast('Medium genehmigt')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Fehler', false)
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
      showToast('Medium abgelehnt')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Fehler', false)
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
      showToast('Medium abgelehnt')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Fehler', false)
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
      showToast(err instanceof Error ? err.message : 'Fehler beim Laden', false)
    } finally {
      setUsersLoading(false)
    }
  }

  async function unbanUser(userId: string) {
    try {
      await fetchApi<void>(`/admin/users/${userId}/unban`, { method: 'PATCH' })
      showToast('Sperre aufgehoben')
      await loadUsers(userPage)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Fehler', false)
    }
  }

  async function setUserRole(userId: string, role: string) {
    try {
      await fetchApi<unknown>(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      })
      showToast('Rolle gespeichert')
      await loadUsers(userPage)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Fehler', false)
    }
  }

  // ── Tickets ────────────────────────────────────────────────────────────────
  const [tickets, setTickets]           = useState<AdminReport[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)

  async function loadTickets() {
    setTicketsLoading(true)
    try {
      const data = await fetchApi<Paginated<AdminReport>>('/admin/reports?status=open&limit=50&page=1')
      const sorted = [...data.data].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      setTickets(sorted)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Fehler beim Laden', false)
    } finally {
      setTicketsLoading(false)
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
      showToast(err instanceof Error ? err.message : 'Fehler beim Laden', false)
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
      showToast('Meldung aktualisiert')
      await loadReports(reportPage)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Fehler', false)
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
      showToast(err instanceof Error ? err.message : 'Fehler beim Laden', false)
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
      showToast('Strike erstellt')
      await loadStrikes(strikePage)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Fehler', false)
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
      showToast(err instanceof Error ? err.message : 'Fehler beim Laden', false)
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
      showToast('Wort hinzugefügt')
      await loadProfanity()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Fehler', false)
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
      showToast('Wort entfernt')
      await loadProfanity()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Fehler', false)
    } finally {
      setDeleteSaving(false)
    }
  }

  // ── Settings ───────────────────────────────────────────────────────────────
  const [settingsLoading, setSettingsLoading]       = useState(false)
  const [settingsSaving, setSettingsSaving]         = useState(false)
  const [autoSuspendThreshold, setAutoSuspendThreshold] = useState('10')

  async function loadSettings() {
    setSettingsLoading(true)
    try {
      const data = await fetchApi<SystemSetting[]>('/admin/settings')
      const threshold = data.find((s) => s.key === 'auto_suspend_threshold')
      if (threshold) setAutoSuspendThreshold(threshold.value)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Fehler beim Laden', false)
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
      showToast('Einstellung gespeichert')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Fehler', false)
    } finally {
      setSettingsSaving(false)
    }
  }

  // ── Load on tab change ─────────────────────────────────────────────────────
  useEffect(() => {
    if (getJwtRole(accessToken) !== 'admin') return
    if (activeTab === 'tickets')   loadTickets()
    if (activeTab === 'media')     loadMedia()
    if (activeTab === 'users')     loadUsers(1)
    if (activeTab === 'reports')   loadReports(1)
    if (activeTab === 'strikes')   loadStrikes(1)
    if (activeTab === 'profanity') loadProfanity()
    if (activeTab === 'settings')  loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // ── Tab definitions ────────────────────────────────────────────────────────
  const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'tickets',   label: 'Tickets',        icon: <Inbox className="h-4 w-4" /> },
    { key: 'media',     label: 'Medien',         icon: <ImageIcon className="h-4 w-4" /> },
    { key: 'users',     label: 'Nutzer',          icon: <Users className="h-4 w-4" /> },
    { key: 'reports',   label: 'Meldungen',       icon: <FileText className="h-4 w-4" /> },
    { key: 'strikes',   label: 'Strikes',         icon: <Zap className="h-4 w-4" /> },
    { key: 'profanity', label: 'Schimpfwörter',   icon: <BookOpen className="h-4 w-4" /> },
    { key: 'settings',  label: 'Einstellungen',   icon: <Settings className="h-4 w-4" /> },
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
          <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5 space-y-4">

            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                Offene Tickets
              </p>
              <button onClick={loadTickets} className="text-xs text-on-surface-variant hover:text-on-surface underline">
                Aktualisieren
              </button>
            </div>

            <Divider />

            {ticketsLoading ? (
              <div className="flex justify-center py-10"><Spinner size={6} /></div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-on-surface-variant">
                <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
                <p className="text-sm">Keine offenen Tickets</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-surface-container-high border border-outline-variant"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium text-on-surface truncate">
                        {t.reporter_nickname ?? t.reporter_id.slice(0, 8)}
                        <span className="text-on-surface-variant font-normal mx-1.5">→</span>
                        {t.reported_nickname ?? t.reported_user_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-on-surface-variant">{t.reason}</p>
                      <p className="text-xs text-on-surface-variant/60">{fmtDate(t.created_at)}</p>
                    </div>
                    <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-error-container text-error">
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Medien ───────────────────────────────────────────────────── */}
        {activeTab === 'media' && (
          <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                Ausstehende Medien
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setSwipeSnapshot([...media]); setSwipeMode(true) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-fixed-dim text-on-primary-container text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  Swipe-Modus
                </button>
                <button onClick={loadMedia} className="text-xs text-on-surface-variant hover:text-on-surface underline">
                  Aktualisieren
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
                  {f === 'all' ? 'Alle' : f === 'image' ? 'Bilder' : 'Audio'}
                </button>
              ))}
            </div>

            {mediaLoading ? (
              <div className="flex justify-center py-10"><Spinner size={6} /></div>
            ) : media.filter((m) => mediaFilter === 'all' || m.file_type === mediaFilter).length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-on-surface-variant">
                <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
                <p className="text-sm">Keine ausstehenden Medien</p>
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
                        alt={`Medium von ${m.nickname ?? m.uploaded_by}`}
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
                          {m.file_type === 'audio' ? 'Audio' : 'Medium'}
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
                          aria-label="Genehmigen"
                        >
                          <Check className="h-3 w-3" />
                          OK
                        </button>
                        <button
                          onClick={() => { setRejectModal({ id: m.id }); setRejectReason('') }}
                          className="flex-1 py-1.5 rounded-lg bg-error-container text-error text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                          aria-label="Ablehnen"
                        >
                          <X className="h-3 w-3" />
                          Nein
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
                placeholder="Nickname suchen…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadUsers(1) }}
                className="flex-1 min-w-[160px] px-3 py-2 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim min-h-[40px]"
              />
              <select
                value={userRoleFilter}
                onChange={(e) => { setUserRoleFilter(e.target.value); loadUsers(1) }}
                className="px-3 py-2 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none min-h-[40px]"
                aria-label="Rolle filtern"
              >
                <option value="">Alle Rollen</option>
                <option value="user">user</option>
                <option value="admin">admin</option>
                <option value="org">org</option>
              </select>
              <select
                value={userBannedFilter}
                onChange={(e) => { setUserBannedFilter(e.target.value); loadUsers(1) }}
                className="px-3 py-2 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none min-h-[40px]"
                aria-label="Gesperrt filtern"
              >
                <option value="">Alle</option>
                <option value="true">Gesperrt</option>
                <option value="false">Aktiv</option>
              </select>
              <button
                onClick={() => loadUsers(1)}
                className="px-3 py-2 rounded-xl bg-primary-fixed-dim text-on-primary-container text-sm font-medium hover:opacity-90 transition-opacity min-h-[40px]"
              >
                Suchen
              </button>
            </div>

            <Divider />

            {usersLoading ? (
              <div className="flex justify-center py-8"><Spinner size={6} /></div>
            ) : !users || users.data.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-8">Keine Nutzer gefunden</p>
            ) : (
              <>
                <div className="overflow-x-auto -mx-4 sm:-mx-5">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b border-outline-variant">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Nickname</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Rolle</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Erstellt</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-on-surface-variant">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {users.data.map((u) => (
                        <tr key={u.id} className="hover:bg-surface-container-high/50">
                          <td className="px-4 py-3 font-medium text-on-surface">
                            {u.nickname ?? <span className="text-on-surface-variant italic">—</span>}
                            {u.vulnerable_flag && (
                              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-error-container text-error">Vulnerabel</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={u.role}
                              onChange={(e) => setUserRole(u.id, e.target.value)}
                              className="px-2 py-1 rounded-lg bg-transparent border border-outline-variant text-on-surface text-xs focus:outline-none"
                              aria-label={`Rolle von ${u.nickname ?? u.id}`}
                            >
                              <option value="user">user</option>
                              <option value="admin">admin</option>
                              <option value="org">org</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            {u.is_banned ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-error-container text-error">Gesperrt</span>
                                {u.ban_reason?.startsWith('Automatische Sperre') && (
                                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-error-container/50 text-error">Auto-Suspend</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">Aktiv</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant text-xs">{fmtDate(u.created_at)}</td>
                          <td className="px-4 py-3 text-right">
                            {u.is_banned ? (
                              <button
                                onClick={() => unbanUser(u.id)}
                                className="text-xs px-3 py-1.5 rounded-full border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors"
                              >
                                Entsperren
                              </button>
                            ) : (
                              <button
                                onClick={() => setBanModal({ userId: u.id, nickname: u.nickname ?? u.id.slice(0, 8) })}
                                className="text-xs px-3 py-1.5 rounded-full border border-error/40 text-error hover:bg-error-container transition-colors flex items-center gap-1"
                              >
                                <Ban className="h-3 w-3" />
                                Sperren
                              </button>
                            )}
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
                aria-label="Status filtern"
              >
                <option value="">Alle Status</option>
                <option value="open">Offen</option>
                <option value="reviewed">Geprüft</option>
                <option value="closed">Geschlossen</option>
              </select>
              <button
                onClick={() => loadReports(1)}
                className="px-3 py-2 rounded-xl bg-primary-fixed-dim text-on-primary-container text-sm font-medium hover:opacity-90 transition-opacity min-h-[40px]"
              >
                Laden
              </button>
            </div>

            <Divider />

            {reportsLoading ? (
              <div className="flex justify-center py-8"><Spinner size={6} /></div>
            ) : !reports || reports.data.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-8">Keine Meldungen gefunden</p>
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
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-error-container/50 text-error">Auto-Suspend</span>
                            )}
                            <button
                              onClick={() => setBanModal({ userId: r.reported_user_id, nickname: r.reported_nickname ?? r.reported_user_id.slice(0, 8), reportId: r.id })}
                              className="text-xs px-2 py-1 rounded-full border border-error/40 text-error hover:bg-error-container transition-colors flex items-center gap-1"
                            >
                              <Ban className="h-3 w-3" aria-hidden="true" />
                              Sperren
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
                                Speichern
                              </button>
                            </div>
                            <textarea
                              value={edit.note}
                              onChange={(e) => setReportEdits((prev) => ({ ...prev, [r.id]: { ...edit, note: e.target.value } }))}
                              placeholder="Notiz für Admins…"
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
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Strike-Liste</p>
              <button
                onClick={() => { setStrikeModal(true); setStrikeUserId(''); setStrikeNicknameQuery(''); setStrikeSearchResults([]); setStrikeType('warning'); setStrikeReason(''); setStrikeExpires('') }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-fixed-dim text-on-primary-container text-sm font-medium hover:opacity-90 transition-opacity min-h-[40px]"
              >
                <Plus className="h-4 w-4" />
                Neuer Strike
              </button>
            </div>

            <input
              type="search"
              placeholder="Nickname suchen..."
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
              <p className="text-sm text-on-surface-variant text-center py-8">Keine Strikes vorhanden</p>
            ) : (
              <>
                <div className="overflow-x-auto -mx-4 sm:-mx-5">
                  <table className="w-full text-sm min-w-[540px]">
                    <thead>
                      <tr className="border-b border-outline-variant">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Nutzer</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Typ</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Grund</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Läuft ab</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant">Erstellt</th>
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
                                  AUFGEHOBEN
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
              Benutzerdefinierte Wörter
            </p>

            {/* Add word */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Neues Wort…"
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
                Hinzufügen
              </button>
            </div>

            <Divider />

            {profanityLoading ? (
              <div className="flex justify-center py-8"><Spinner size={6} /></div>
            ) : profanity.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-8">Keine benutzerdefinierten Wörter</p>
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
                      aria-label={`${w.word} entfernen`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Einstellungen ────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5 space-y-4">

            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
              System-Einstellungen
            </p>

            {settingsLoading ? (
              <div className="flex justify-center py-8"><Spinner size={6} /></div>
            ) : (
              <div className="space-y-3">

                {/* Auto-Suspend threshold */}
                <div className="rounded-xl border border-outline-variant bg-surface-container-high p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-on-surface">Auto-Suspend Schwellenwert</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Anzahl unabhängiger offener Meldungen bis zur automatischen Sperre
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
                      aria-label="Auto-Suspend Schwellenwert"
                    />
                    <button
                      onClick={saveAutoSuspendThreshold}
                      disabled={settingsSaving || !autoSuspendThreshold || Number(autoSuspendThreshold) < 1 || Number(autoSuspendThreshold) > 100}
                      className={btnPrimary}
                    >
                      {settingsSaving && <Spinner size={4} />}
                      Speichern
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
        <ModalOverlay title="Medium ablehnen" onClose={() => setRejectModal(null)}>
          <div className="space-y-3">
            <label className="text-sm text-on-surface-variant" htmlFor="reject-reason">Ablehnungsgrund</label>
            <textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Warum wird das Medium abgelehnt?"
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
              Ablehnen
            </button>
            <button onClick={() => setRejectModal(null)} className={`${btnOutline} flex-1 justify-center`}>
              Abbrechen
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
            showToast('Nutzer gesperrt')
            if (activeTab === 'users')   void loadUsers(userPage)
            if (activeTab === 'reports') void loadReports(reportPage)
          }}
          onClose={() => setBanModal(null)}
        />
      )}

      {/* ── Modal: Neuer Strike ───────────────────────────────────────────────── */}
      {strikeModal && (
        <ModalOverlay title="Neuer Strike" onClose={() => setStrikeModal(false)}>
          <div className="space-y-3">
            <div className="relative">
              <label className="text-sm text-on-surface-variant block mb-1" htmlFor="strike-nickname">Nickname suchen *</label>
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
                placeholder="Nickname eingeben…"
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
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-error-container text-error">Vulnerabel</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm text-on-surface-variant block mb-1" htmlFor="strike-type">Typ *</label>
              <select
                id="strike-type"
                value={strikeType}
                onChange={(e) => setStrikeType(e.target.value as 'warning' | 'temp' | 'permanent')}
                className={inputCls}
              >
                <option value="warning">warning — Verwarnung</option>
                <option value="temp">temp — Temporäre Sperre</option>
                <option value="permanent">permanent — Permanente Sperre</option>
              </select>
            </div>
            {strikeType === 'temp' && (
              <div>
                <label className="text-sm text-on-surface-variant block mb-1" htmlFor="strike-expires">Ablaufdatum *</label>
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
              <label className="text-sm text-on-surface-variant block mb-1" htmlFor="strike-reason">Grund * (mind. 10 Zeichen)</label>
              <textarea
                id="strike-reason"
                value={strikeReason}
                onChange={(e) => setStrikeReason(e.target.value)}
                placeholder="Begründung für den Strike…"
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
              Strike erstellen
            </button>
            <button onClick={() => setStrikeModal(false)} className={`${btnOutline} flex-1 justify-center`}>
              Abbrechen
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
        <ModalOverlay title="Wort entfernen?" onClose={() => setDeleteConfirm(null)}>
          <p className="text-sm text-on-surface-variant">
            Das Wort <span className="font-mono font-semibold text-on-surface">{deleteConfirm}</span> wird
            aus der Filterliste entfernt.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              onClick={submitDeleteWord}
              disabled={deleteSaving}
              className={`${btnPrimary} flex-1 justify-center bg-error-container text-error`}
            >
              {deleteSaving && <Spinner size={4} />}
              Entfernen
            </button>
            <button onClick={() => setDeleteConfirm(null)} className={`${btnOutline} flex-1 justify-center`}>
              Abbrechen
            </button>
          </div>
        </ModalOverlay>
      )}

    </main>
  )
}
