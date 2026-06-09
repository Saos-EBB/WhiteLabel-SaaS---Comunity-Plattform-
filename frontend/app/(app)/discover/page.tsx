'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Heart, X, MapPin, Users, UserRoundX, ChevronDown,
  Sparkles, RefreshCw,
} from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { OnlineIndicator, getStatusColor } from '@/components/ui/OnlineIndicator'
import { useConnectionAction, type ConnectionStatus } from '@/hooks/useConnectionAction'
import { CityAutocomplete } from '@/components/ui/CityAutocomplete'
import { useTranslation } from '@/lib/i18n'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeckInterest {
  name_de: string
  name_en: string | null
  is_green: boolean
}

interface DeckCandidate {
  user_id: string
  nickname: string
  photo_url: string | null
  city: string | null
  age: number
  gender: string | null
  looking_for: string | null
  bio: string | null
  distance_km: number | null
  match_score: number
  interests: DeckInterest[]
}

interface SwipeResult {
  matched: boolean
  conversation_id: string | null
}

interface ProfileInterest {
  id: string
  name_de: string
  category: string | null
}

interface SearchProfile {
  id: string
  user_id: string
  nickname: string
  birthdate: string | null
  city: string | null
  bio: string | null
  photo_url: string | null
  photo_needs_review?: boolean
  is_online: boolean
  status_message: string | null
  gender: string | null
  looking_for: string | null
  interests: ProfileInterest[]
  onboarding_completed: boolean
  is_published: boolean
  connection_status: ConnectionStatus
  conversation_id: string | null
  request_id: string | null
}

// ─── Swipe Tab ────────────────────────────────────────────────────────────────

function InterestTag({ interest }: { interest: DeckInterest }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
        interest.is_green
          ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/40'
          : 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40'
      }`}
    >
      <span>{interest.is_green ? '💚' : '🚩'}</span>
      {interest.name_de}
    </span>
  )
}

function MatchOverlay({
  nickname,
  photoUrl,
  conversationId,
  onClose,
}: {
  nickname: string
  photoUrl: string | null
  conversationId: string | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const router = useRouter()
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.discover.matchTitle}
    >
      <div
        className="rounded-3xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl"
        style={{ background: 'var(--color-surface-container-high)' }}
      >
        {/* Avatar */}
        <div className="flex justify-center">
          <div className="relative h-24 w-24 rounded-full overflow-hidden ring-4 ring-green-500/60">
            {photoUrl ? (
              <img
                src={photoUrl.replace('http://localhost:3000', '')}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-surface-container">
                <Users className="h-10 w-10 text-outline" aria-hidden />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <h2
            className="text-3xl font-bold"
            style={{ color: 'var(--color-primary-fixed-dim)' }}
          >
            {t.discover.matchTitle}
          </h2>
          <p className="text-on-surface-variant text-sm">
            {t.discover.matchDesc.replace('{nickname}', nickname)}
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {conversationId && (
            <button
              onClick={() => router.push(`/chat/${conversationId}`)}
              className="w-full py-3 rounded-full font-semibold text-sm min-h-[44px] hover:opacity-90 active:scale-95 transition-all"
              style={{
                background: 'var(--color-primary-fixed-dim)',
                color: 'var(--color-on-primary-container)',
              }}
            >
              {t.discover.matchOpenChat}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-full border border-outline-variant text-on-surface-variant font-semibold text-sm min-h-[44px] hover:bg-surface-container active:scale-95 transition-all"
          >
            {t.discover.matchContinue}
          </button>
        </div>
      </div>
    </div>
  )
}

function SwipeCard({ candidate }: { candidate: DeckCandidate }) {
  const { t } = useTranslation()
  return (
    <article
      className="w-full max-w-sm mx-auto rounded-3xl overflow-hidden shadow-xl"
      style={{ background: 'var(--color-surface-container)' }}
    >
      {/* Photo */}
      <div className="relative aspect-[3/4] bg-surface-container-high overflow-hidden">
        {candidate.photo_url ? (
          <img
            src={candidate.photo_url.replace('http://localhost:3000', '')}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Users className="h-16 w-16 text-outline" aria-hidden />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

        {/* Bottom info on photo */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-1">
          <div className="flex items-end gap-2">
            <Link
              href={`/profile/${candidate.nickname}`}
              className="text-white font-bold text-xl leading-tight hover:underline"
            >
              {candidate.nickname}
            </Link>
            <span className="text-white/80 text-lg font-medium">{candidate.age}</span>
          </div>
          {candidate.city && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-white/70 flex-shrink-0" aria-hidden />
              <span className="text-white/80 text-sm">
                {candidate.city}
                {candidate.distance_km != null && (
                  <span className="text-white/60"> · {candidate.distance_km} {t.discover.km}</span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="p-4 space-y-3">
        {candidate.bio && (
          <p className="text-on-surface-variant text-sm line-clamp-2">{candidate.bio}</p>
        )}

        {candidate.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {candidate.interests.slice(0, 6).map((i, idx) => (
              <InterestTag key={idx} interest={i} />
            ))}
          </div>
        )}

        {candidate.interests.length === 0 && (
          <p className="text-on-surface-variant/50 text-xs italic">Keine Interessen angegeben</p>
        )}
      </div>
    </article>
  )
}

function SwipeTab() {
  const { t } = useTranslation()
  const [deck, setDeck] = useState<DeckCandidate[]>([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [limitError, setLimitError] = useState(false)
  const [swiping, setSwiping] = useState(false)
  const [match, setMatch] = useState<{ nickname: string; photoUrl: string | null; conversationId: string | null } | null>(null)
  // Swipe direction animation hint
  const [swipeDir, setSwipeDir] = useState<'like' | 'skip' | null>(null)
  const swipeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadDeck()
    return () => { if (swipeTimeout.current) clearTimeout(swipeTimeout.current) }
  }, [])

  async function loadDeck() {
    setLoading(true)
    setError(null)
    setLimitError(false)
    setIdx(0)
    try {
      const data = await fetchApi<DeckCandidate[]>('/discover/deck')
      setDeck(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err instanceof Error && err.message === 'Session expired') return
      setError(err instanceof Error ? err.message : t.discover.swipeError)
    } finally {
      setLoading(false)
    }
  }

  async function handleSwipe(action: 'like' | 'skip') {
    if (swiping || idx >= deck.length) return
    const candidate = deck[idx]
    setSwiping(true)
    setSwipeDir(action)

    try {
      const result = await fetchApi<SwipeResult>('/discover/swipe', {
        method: 'POST',
        body: JSON.stringify({ target_user_id: candidate.user_id, action }),
      })
      if (result.matched) {
        setMatch({
          nickname: candidate.nickname,
          photoUrl: candidate.photo_url,
          conversationId: result.conversation_id,
        })
      } else {
        advance()
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Swipe-Limit')) {
        setLimitError(true)
      } else if (err instanceof Error && err.message !== 'Session expired') {
        setError(err.message)
      }
    } finally {
      setSwiping(false)
      swipeTimeout.current = setTimeout(() => setSwipeDir(null), 300)
    }
  }

  function advance() {
    setIdx(i => i + 1)
    setSwipeDir(null)
  }

  function dismissMatch() {
    setMatch(null)
    advance()
  }

  const current = deck[idx]
  const hasMore = idx < deck.length

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-8 w-8 rounded-full border-2 border-primary-fixed-dim/30 border-t-primary-fixed-dim animate-spin" aria-hidden />
        <p className="text-on-surface-variant text-sm">{t.common.loading}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <UserRoundX className="h-12 w-12 text-error" aria-hidden />
        <p className="text-on-surface font-semibold">{t.discover.swipeError}</p>
        <p className="text-on-surface-variant text-sm">{error}</p>
        <button
          onClick={loadDeck}
          className="px-6 py-2.5 rounded-full font-semibold text-sm min-h-[44px] hover:opacity-90 transition-opacity flex items-center gap-2"
          style={{ background: 'var(--color-primary-fixed-dim)', color: 'var(--color-on-primary-container)' }}
        >
          <RefreshCw size={14} aria-hidden /> Erneut versuchen
        </button>
      </div>
    )
  }

  if (limitError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 max-w-xs mx-auto">
        <div className="text-4xl">⏳</div>
        <p className="text-on-surface font-semibold">{t.discover.swipeLimitReached}</p>
        <p className="text-on-surface-variant text-sm">{t.discover.swipeLimitDesc}</p>
      </div>
    )
  }

  if (!hasMore) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <Sparkles className="h-12 w-12 text-on-surface-variant" aria-hidden />
        <p className="text-on-surface font-semibold">{t.discover.swipeEmpty}</p>
        <p className="text-on-surface-variant text-sm">{t.discover.swipeEmptyDesc}</p>
        <button
          onClick={loadDeck}
          className="px-6 py-2.5 rounded-full font-semibold text-sm min-h-[44px] hover:opacity-90 transition-opacity flex items-center gap-2"
          style={{ background: 'var(--color-primary-fixed-dim)', color: 'var(--color-on-primary-container)' }}
        >
          <RefreshCw size={14} aria-hidden /> Neu laden
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 pb-6">
      {/* Interest nudge */}
      <div
        className="w-full max-w-sm mx-auto px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm"
        style={{
          background: 'var(--color-surface-container)',
          border: '1px solid var(--color-outline-variant)',
        }}
      >
        <Sparkles size={14} className="text-primary-fixed-dim flex-shrink-0" aria-hidden />
        <span className="text-on-surface-variant flex-1">{t.discover.interestNudge}</span>
        <Link
          href="/profile"
          className="text-sm font-semibold whitespace-nowrap"
          style={{ color: 'var(--color-primary-fixed-dim)' }}
        >
          {t.discover.interestNudgeLink}
        </Link>
      </div>

      {/* Card with animation */}
      <div
        className="w-full transition-all duration-200"
        style={{
          transform: swipeDir === 'like'
            ? 'translateX(8px) rotate(1.5deg)'
            : swipeDir === 'skip'
            ? 'translateX(-8px) rotate(-1.5deg)'
            : 'none',
          opacity: swiping ? 0.85 : 1,
        }}
      >
        <SwipeCard candidate={current} />
      </div>

      {/* Counter */}
      <p className="text-on-surface-variant text-xs">
        {idx + 1} / {deck.length}
      </p>

      {/* Action buttons */}
      <div className="flex items-center gap-8">
        <button
          onClick={() => handleSwipe('skip')}
          disabled={swiping}
          aria-label={t.discover.swipeSkip}
          className="h-16 w-16 rounded-full flex items-center justify-center shadow-lg border-2 border-red-500/40 bg-surface-container hover:bg-red-500/10 active:scale-95 disabled:opacity-40 transition-all"
        >
          <X className="h-7 w-7 text-red-400" aria-hidden />
        </button>

        <button
          onClick={() => handleSwipe('like')}
          disabled={swiping}
          aria-label={t.discover.swipeLike}
          className="h-16 w-16 rounded-full flex items-center justify-center shadow-lg border-2 border-green-500/40 bg-surface-container hover:bg-green-500/10 active:scale-95 disabled:opacity-40 transition-all"
        >
          <Heart className="h-7 w-7 text-green-400" fill="currentColor" aria-hidden />
        </button>
      </div>

      {match && (
        <MatchOverlay
          nickname={match.nickname}
          photoUrl={match.photoUrl}
          conversationId={match.conversationId}
          onClose={dismissMatch}
        />
      )}
    </div>
  )
}

// ─── Search Tab (existing browse functionality) ────────────────────────────────

const DEFAULT_FILTERS = {
  city: '',
  lat: null as number | null,
  lng: null as number | null,
  radius: 50,
  gender: '',
  looking_for: '',
  min_age: '',
  max_age: '',
  online_only: false,
  connection_status: '',
}

function calcAge(birthdate: string | null | undefined): number | null {
  if (!birthdate) return null
  return Math.floor((Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

function buildQuery(f: typeof DEFAULT_FILTERS): string {
  const params = new URLSearchParams()
  if (f.lat != null) {
    params.set('lat', String(f.lat))
    params.set('lng', String(f.lng))
    params.set('radius', String(f.radius))
  } else if (f.city.trim()) {
    params.set('city', f.city.trim())
  }
  if (f.gender)             params.set('gender', f.gender)
  if (f.looking_for)        params.set('looking_for', f.looking_for)
  if (f.min_age)            params.set('min_age', f.min_age)
  if (f.max_age)            params.set('max_age', f.max_age)
  if (f.online_only)        params.set('online_only', 'true')
  if (f.connection_status)  params.set('connection_status', f.connection_status)
  const qs = params.toString()
  return qs ? `/profile/search?${qs}` : '/profile/search'
}

function Spinner() {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <span className="h-3.5 w-3.5 rounded-full border-2 border-on-primary-container/30 border-t-on-primary-container animate-spin" aria-hidden />
      Sende…
    </span>
  )
}

function SearchProfileCard({
  profile,
  onUpdate,
}: {
  profile: SearchProfile
  onUpdate: (userId: string, changes: Partial<SearchProfile>) => void
}) {
  const router = useRouter()
  const { t } = useTranslation()
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false)
  const conn = useConnectionAction(
    profile.user_id,
    profile.connection_status ?? 'NONE',
    profile.request_id,
    profile.conversation_id,
  )

  async function handleConnect() {
    if (await conn.sendRequest()) {
      onUpdate(profile.user_id, { connection_status: 'SENT' })
    }
  }

  async function handleAccept() {
    const convId = await conn.acceptRequest()
    if (convId !== null) {
      onUpdate(profile.user_id, { connection_status: 'CONNECTED', conversation_id: convId, request_id: null })
    }
  }

  async function handleDisconnect() {
    if (await conn.disconnect()) {
      onUpdate(profile.user_id, { connection_status: 'NONE', conversation_id: null })
      setDisconnectConfirmOpen(false)
    }
  }

  const age = calcAge(profile.birthdate)

  function renderAction() {
    const cs = conn.connectionStatus
    if (cs === 'CONNECTED') {
      return (
        <div className="space-y-2">
          <button
            onClick={() => conn.conversationId && router.push(`/chat/${conn.conversationId}`)}
            disabled={!conn.conversationId}
            className="w-full py-2.5 rounded-full bg-primary-fixed-dim text-on-primary-container text-xs sm:text-sm font-semibold min-h-[44px] hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {t.publicProfile.chat}
          </button>
          <button
            onClick={() => setDisconnectConfirmOpen(true)}
            className="w-full py-2.5 rounded-full border border-outline-variant text-on-surface-variant text-xs sm:text-sm font-medium min-h-[44px] hover:bg-surface-container-high active:scale-95 transition-all"
          >
            {t.discover.disconnectLabel}
          </button>
        </div>
      )
    }
    if (cs === 'SENT') {
      return (
        <div className="w-full py-2.5 rounded-full bg-surface-container-high text-primary-fixed-dim text-xs sm:text-sm font-semibold text-center" role="status">
          {t.discover.requestSent}
        </div>
      )
    }
    if (cs === 'RECEIVED') {
      return (
        <button
          onClick={handleAccept}
          disabled={conn.isLoading}
          className="w-full py-2.5 rounded-full bg-tertiary-fixed-dim text-on-primary-container text-xs sm:text-sm font-semibold min-h-[44px] hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {conn.isLoading ? <Spinner /> : t.discover.acceptRequest}
        </button>
      )
    }
    return (
      <button
        onClick={handleConnect}
        disabled={conn.isLoading}
        className="w-full py-2.5 rounded-full bg-primary-fixed-dim text-on-primary-container text-xs sm:text-sm font-semibold min-h-[44px] hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {conn.isLoading ? <Spinner /> : t.publicProfile.connect}
      </button>
    )
  }

  return (
    <article className="rounded-2xl bg-surface-container border border-outline-variant overflow-hidden flex flex-col">
      <div className="aspect-[3/4] bg-surface-container-high flex items-center justify-center overflow-hidden relative" aria-hidden>
        {profile.photo_url ? (
          <img
            src={profile.photo_url.replace('http://localhost:3000', '')}
            alt=""
            className={`h-full w-full object-cover${profile.photo_needs_review ? ' blur-sm' : ''}`}
          />
        ) : (
          <Users className="h-10 w-10 text-outline" />
        )}
        {profile.photo_needs_review && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-error/80 text-white text-[10px] font-semibold px-2 py-1 rounded-full backdrop-blur-sm whitespace-nowrap pointer-events-none">
            {t.publicProfile.underReview}
          </div>
        )}
        {profile.is_online && (
          <span
            className="absolute bottom-2 right-2 h-3.5 w-3.5 rounded-full ring-2 ring-surface-container"
            style={{ backgroundColor: getStatusColor(profile.is_online, profile.status_message) }}
            aria-hidden
          />
        )}
      </div>

      <div className="p-3 sm:p-4 flex flex-col gap-3 flex-1">
        <div>
          <p className="font-semibold text-on-surface text-sm sm:text-base leading-tight">
            <Link href={`/profile/${profile.nickname}`} className="hover:underline cursor-pointer">
              {profile.nickname}
            </Link>
            {age !== null && `, ${age}`}
          </p>
          {profile.city && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-on-surface-variant flex-shrink-0" aria-hidden />
              <p className="text-xs text-on-surface-variant truncate">{profile.city}</p>
            </div>
          )}
          {profile.status_message && (
            <div className="mt-1">
              <OnlineIndicator is_online={profile.is_online} status_message={profile.status_message} size="sm" />
            </div>
          )}
        </div>

        {profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {profile.interests.slice(0, 3).map((i) => (
              <span key={i.id} className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-medium">
                {i.name_de}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto space-y-2">
          {renderAction()}
          {conn.error && <p className="text-xs text-error text-center leading-tight" role="alert">{conn.error}</p>}
        </div>
      </div>

      {disconnectConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true">
          <div className="bg-surface-container-high rounded-2xl p-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="font-semibold text-on-surface">{t.publicProfile.disconnectTitle}</p>
              <p className="text-sm text-on-surface-variant">{t.discover.disconnectDesc}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <button
                onClick={handleDisconnect}
                disabled={conn.isLoading}
                className="flex-1 py-3 rounded-full bg-error-container text-error font-semibold text-sm min-h-[44px] hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {conn.isLoading && <span className="h-3.5 w-3.5 rounded-full border-2 border-error/30 border-t-error animate-spin" aria-hidden />}
                {t.publicProfile.disconnect}
              </button>
              <button
                onClick={() => setDisconnectConfirmOpen(false)}
                disabled={conn.isLoading}
                className="flex-1 py-3 rounded-full border border-outline-variant text-on-surface font-semibold text-sm min-h-[44px] hover:bg-surface-container active:scale-95 disabled:opacity-50 transition-all"
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-surface-container border border-outline-variant overflow-hidden animate-pulse">
      <div className="aspect-[3/4] bg-surface-container-high" />
      <div className="p-3 sm:p-4 space-y-3">
        <div className="space-y-1.5">
          <div className="h-4 w-24 rounded-lg bg-surface-container-high" />
          <div className="h-3 w-16 rounded-lg bg-surface-container-high" />
        </div>
        <div className="h-11 w-full rounded-full bg-surface-container-high" />
      </div>
    </div>
  )
}

function SearchTab() {
  const { t } = useTranslation()
  const [profiles, setProfiles] = useState<SearchProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const receivedCount = profiles.filter(p => p.connection_status === 'RECEIVED').length

  async function loadProfiles(f: typeof DEFAULT_FILTERS) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchApi<SearchProfile[] | { data: SearchProfile[] }>(buildQuery(f))
      setProfiles(Array.isArray(res) ? res : (res?.data ?? []))
    } catch (err) {
      if (err instanceof Error && err.message === 'Session expired') return
      setError(err instanceof Error ? err.message : 'Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProfiles(DEFAULT_FILTERS) }, [])

  function handleProfileUpdate(userId: string, changes: Partial<SearchProfile>) {
    setProfiles(ps => ps.map(p => p.user_id === userId ? { ...p, ...changes } : p))
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="col-span-2 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none z-10" aria-hidden />
            <CityAutocomplete
              value={filters.city}
              onSelect={(city) => setFilters(f => ({ ...f, city: city.name, lat: Number(city.lat), lng: Number(city.lng) }))}
              onClear={() => setFilters(f => ({ ...f, city: '', lat: null, lng: null }))}
              placeholder={t.discover.cityPlaceholder}
              ariaLabel={t.discover.cityAriaLabel}
              inputClassName="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-fixed-dim min-h-[44px] transition-colors"
            />
          </div>
          <div className="relative">
            <select
              value={filters.gender}
              onChange={(e) => setFilters(f => ({ ...f, gender: e.target.value }))}
              className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim min-h-[44px] transition-colors cursor-pointer"
              aria-label="Nach Geschlecht filtern"
            >
              <option value="">{t.discover.filterAll}</option>
              <option value="male">{t.onboarding.genderMale}</option>
              <option value="female">{t.onboarding.genderFemale}</option>
              <option value="non_binary">{t.onboarding.genderNonBinary}</option>
              <option value="diverse">{t.onboarding.genderDiverse}</option>
              <option value="not_specified">{t.onboarding.noChoice}</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none" aria-hidden />
          </div>
          <div className="relative">
            <select
              value={filters.looking_for}
              onChange={(e) => setFilters(f => ({ ...f, looking_for: e.target.value }))}
              className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim min-h-[44px] transition-colors cursor-pointer"
              aria-label="Nach Suchanliegen filtern"
            >
              <option value="">{t.discover.filterAll}</option>
              <option value="friendship">{t.publicProfile.lookingForFriendship}</option>
              <option value="relationship">{t.publicProfile.lookingForRelationship}</option>
              <option value="exchange">{t.publicProfile.lookingForExchange}</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none" aria-hidden />
          </div>
        </div>

        <div className={`flex items-center gap-3${filters.lat == null ? ' opacity-40' : ''}`}>
          <MapPin className="h-4 w-4 text-on-surface-variant flex-shrink-0" aria-hidden />
          <input
            type="range" min={10} max={500} step={10} value={filters.radius}
            disabled={filters.lat == null}
            onChange={(e) => setFilters(f => ({ ...f, radius: Number(e.target.value) }))}
            className="flex-1 accent-primary-fixed-dim disabled:cursor-not-allowed"
            aria-label="Umkreis in km"
          />
          <span className="text-sm text-on-surface-variant w-40 text-right">
            {filters.lat != null
              ? t.discover.radiusWithCity.replace('{radius}', String(filters.radius))
              : t.discover.radiusNoCity}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number" value={filters.min_age}
            onChange={(e) => setFilters(f => ({ ...f, min_age: e.target.value }))}
            placeholder={t.discover.ageFrom} min={18} max={99}
            className="w-[7.5rem] px-3 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-fixed-dim min-h-[44px] transition-colors"
            aria-label="Mindestalter"
          />
          <span className="text-on-surface-variant text-sm" aria-hidden>–</span>
          <input
            type="number" value={filters.max_age}
            onChange={(e) => setFilters(f => ({ ...f, max_age: e.target.value }))}
            placeholder={t.discover.ageTo} min={18} max={99}
            className="w-[7.5rem] px-3 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-fixed-dim min-h-[44px] transition-colors"
            aria-label="Höchstalter"
          />
          <div className="relative">
            <select
              value={filters.connection_status}
              onChange={(e) => setFilters(f => ({ ...f, connection_status: e.target.value }))}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim min-h-[44px] transition-colors cursor-pointer"
              aria-label="Nach Verbindungsstatus filtern"
            >
              <option value="">{t.discover.connectionAll}</option>
              <option value="CONNECTED">{t.discover.connectedFilter}</option>
              <option value="SENT">{t.discover.requestSent}</option>
              <option value="RECEIVED">
                {receivedCount > 0 ? `${t.discover.requestReceived} (${receivedCount})` : t.discover.requestReceived}
              </option>
              <option value="NONE">{t.discover.noConnection}</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none" aria-hidden />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none ml-1">
            <input type="checkbox" checked={filters.online_only}
              onChange={(e) => setFilters(f => ({ ...f, online_only: e.target.checked }))}
              className="sr-only"
            />
            <span className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${filters.online_only ? 'bg-primary-fixed-dim' : 'bg-surface-container-highest'}`}>
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-sm ring-0 transition duration-200 ease-in-out ${filters.online_only ? 'translate-x-4' : 'translate-x-0'}`} />
            </span>
            <span className="text-sm text-on-surface whitespace-nowrap">{t.discover.onlineNow}</span>
          </label>
          <div className="flex-1" />
          <button onClick={() => { setFilters(DEFAULT_FILTERS); loadProfiles(DEFAULT_FILTERS) }}
            className="px-4 py-2.5 rounded-full border border-outline-variant text-on-surface-variant text-sm font-medium min-h-[44px] hover:bg-surface-container-high transition-colors">
            {t.discover.reset}
          </button>
          <button onClick={() => loadProfiles(filters)} disabled={loading}
            className="px-4 py-2.5 rounded-full bg-primary-fixed-dim text-on-primary-container text-sm font-semibold min-h-[44px] hover:opacity-90 disabled:opacity-50 transition-opacity">
            {t.discover.applyFilter}
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3" role="alert">
          <UserRoundX className="h-12 w-12 text-error" aria-hidden />
          <p className="text-on-surface font-semibold">Fehler beim Laden</p>
          <p className="text-on-surface-variant text-sm">{error}</p>
          <button onClick={() => loadProfiles(filters)}
            className="px-6 py-2.5 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-sm min-h-[44px] hover:opacity-90 transition-opacity">
            Erneut versuchen
          </button>
        </div>
      ) : profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <Users className="h-12 w-12 text-on-surface-variant" aria-hidden />
          <p className="text-on-surface font-semibold">Keine Profile gefunden</p>
          <p className="text-on-surface-variant text-sm">Versuche andere Filtereinstellungen</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4" role="list">
          {profiles.map((profile) => (
            <SearchProfileCard key={profile.id} profile={profile} onUpdate={handleProfileUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'swipe' | 'search'>('swipe')

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 pb-24 sm:pb-8 space-y-5">
      <h1 className="text-2xl font-bold text-on-surface">{t.discover.title}</h1>

      {/* Tab selector */}
      <div
        className="flex rounded-xl p-1 gap-1"
        style={{ background: 'var(--color-surface-container)' }}
        role="tablist"
      >
        {(['swipe', 'search'] as const).map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === id
                ? 'text-on-primary-container shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            style={tab === id ? { background: 'var(--color-primary-fixed-dim)' } : {}}
          >
            {id === 'swipe' ? t.discover.tabSwipe : t.discover.tabSearch}
          </button>
        ))}
      </div>

      {tab === 'swipe' ? <SwipeTab /> : <SearchTab />}
    </main>
  )
}
