'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { MapPin, Play, Loader2, AlertCircle } from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import { blurText } from '@/lib/profanity'
import { OnlineIndicator } from '@/components/ui/OnlineIndicator'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicProfile {
  id: string
  user_id: string
  nickname: string
  birthdate: string | null
  bio: string | null
  city: string | null
  photo_id: string | null
  photo_url: string | null
  photo_needs_review: boolean
  is_online: boolean
  status_message: string | null
}

interface Interest {
  id: string
  name_de: string
  name_en: string | null
  category: string | null
}

interface UserInterest {
  id: string
  user_id: string
  interest_id: string
  interest: Interest
}

type RequestStatus = 'idle' | 'loading' | 'sent' | 'error'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(birthdate: string): number {
  return Math.floor((Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PublicProfilePage() {
  const { nickname } = useParams<{ nickname: string }>()

  const [profile, setProfile]           = useState<PublicProfile | null>(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [interests, setInterests]       = useState<UserInterest[]>([])
  const [loading, setLoading]           = useState(true)
  const [notFound, setNotFound]         = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [photoUrl, setPhotoUrl]         = useState<string | null>(null)

  const [requestStatus, setRequestStatus] = useState<RequestStatus>('idle')
  const [requestError, setRequestError]   = useState<string | null>(null)

  const profanityFilter = useAuthStore((s) => (s.user as any)?.profanity_filter as boolean ?? true)

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const [pubResult, ownResult, interestsResult] = await Promise.allSettled([
          fetchApi<PublicProfile>(`/profile/${encodeURIComponent(nickname)}`),
          fetchApi<{ nickname: string }>('/profile/me'),
          fetchApi<UserInterest[]>(`/profile/${encodeURIComponent(nickname)}/interests`),
        ])

        if (pubResult.status === 'rejected') {
          if (pubResult.reason instanceof Error && pubResult.reason.message === 'Session expired') return
          const msg = pubResult.reason instanceof Error ? pubResult.reason.message : ''
          if (msg === 'Profil nicht gefunden') {
            setNotFound(true)
          } else {
            setError(msg || 'Fehler beim Laden')
          }
          return
        }

        const prof = pubResult.value
        setProfile(prof)
        if (prof.photo_url) {
          try { setPhotoUrl(new URL(prof.photo_url).pathname) } catch { setPhotoUrl(prof.photo_url) }
        }

        if (ownResult.status === 'fulfilled') {
          setIsOwnProfile(ownResult.value.nickname === nickname)
        }

        if (interestsResult.status === 'fulfilled') {
          setInterests(interestsResult.value)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [nickname])

  // ── Contact request ────────────────────────────────────────────────────────

  async function handleContactRequest() {
    if (!profile || requestStatus === 'loading' || requestStatus === 'sent') return
    setRequestStatus('loading')
    setRequestError(null)
    try {
      await fetchApi<unknown>('/chat/requests', {
        method: 'POST',
        body: JSON.stringify({ receiver_id: profile.user_id }),
      })
      setRequestStatus('sent')
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Anfrage fehlgeschlagen')
      setRequestStatus('idle')
    }
  }

  // ── Loading / not found / error ────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-on-surface-variant animate-spin" aria-label="Lädt Profil" />
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
        <AlertCircle className="h-10 w-10 text-on-surface-variant" aria-hidden="true" />
        <p className="text-on-surface font-semibold">Profil nicht gefunden</p>
        <p className="text-on-surface-variant text-sm">
          Das Profil existiert nicht oder ist nicht öffentlich.
        </p>
      </main>
    )
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
        <AlertCircle className="h-10 w-10 text-error" aria-hidden="true" />
        <p className="text-on-surface font-semibold">Profil konnte nicht geladen werden</p>
        <p className="text-on-surface-variant text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-sm min-h-[44px] hover:opacity-90 transition-opacity"
        >
          Erneut versuchen
        </button>
      </main>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-background pb-28 md:pb-8">
      <div className="max-w-md mx-auto px-6 py-8">
        <div className="flex flex-col items-center">

          {/* ── Photo ──────────────────────────────────────────────────────── */}
          <div className="relative w-full aspect-square mb-5">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Profilbild"
                className={`w-full h-full object-cover rounded-3xl${profile.photo_needs_review ? ' blur-sm ring-2 ring-error' : ''}`}
              />
            ) : (
              <div className="w-full h-full rounded-3xl bg-surface-container-high flex items-center justify-center">
                <span className="text-8xl font-bold text-on-surface-variant select-none">
                  {profile.nickname.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {profile.photo_needs_review && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-error/80 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm whitespace-nowrap pointer-events-none">
                Wird überprüft
              </div>
            )}

            {/* Nickname + age — bottom left */}
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-xl">
              <h1 className="text-2xl font-bold text-white leading-tight">{profile.nickname}</h1>
              {profile.birthdate && (
                <p className="text-sm text-white/70 mt-0.5">{calcAge(profile.birthdate)} Jahre</p>
              )}
            </div>

            {/* Location + online — bottom right */}
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-xl">
              <div className="flex items-center gap-1.5 text-white text-sm mb-1">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                <span>{profile.city ?? '—'}</span>
              </div>
              <OnlineIndicator
                is_online={profile.is_online}
                status_message={profanityFilter && profile.status_message ? blurText(profile.status_message) : profile.status_message}
                size="sm"
              />
            </div>
          </div>

          {/* ── Audio player (disabled placeholder) ───────────────────────── */}
          <div className="w-full mb-5">
            <div className="flex items-center gap-3 px-2 opacity-40">
              <button
                disabled
                className="w-10 h-10 rounded-full bg-primary-fixed-dim flex items-center justify-center shrink-0"
                aria-label="Sprachnachricht abspielen"
              >
                <Play className="w-4 h-4 text-on-primary-container ml-0.5" aria-hidden="true" />
              </button>
              <div className="flex-1">
                <div className="w-full bg-outline-variant rounded-full h-1 mb-1">
                  <div className="bg-primary-fixed-dim h-1 rounded-full" style={{ width: '0%' }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant">Sprachnachricht</span>
                  <span className="text-xs text-on-surface-variant">Bald verfügbar</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bio ───────────────────────────────────────────────────────── */}
          {profile.bio && (
            <div className="w-full bg-surface-container rounded-2xl p-6 mb-5">
              <p className="text-on-surface leading-relaxed text-center">
                {profanityFilter ? blurText(profile.bio) : profile.bio}
              </p>
            </div>
          )}

          {/* ── Interests ─────────────────────────────────────────────────── */}
          {interests.length > 0 && (
            <div className="w-full mb-6">
              <h3 className="text-xs font-medium text-on-surface-variant mb-3 text-center uppercase tracking-wide">
                Interessen
              </h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {interests.map((ui) => (
                  <span
                    key={ui.interest_id}
                    className="px-4 py-2 rounded-full bg-surface-container-high text-on-surface text-sm"
                  >
                    {ui.interest.name_de}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Contact request button (other profiles only) ───────────────── */}
          {!isOwnProfile && (
            <div className="w-full">
              {requestError && (
                <div className="flex items-center gap-2 rounded-xl bg-error-container text-error px-4 py-3 text-sm mb-4" role="alert">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {requestError}
                </div>
              )}
              <button
                onClick={handleContactRequest}
                disabled={requestStatus === 'loading' || requestStatus === 'sent'}
                className="w-full py-4 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {requestStatus === 'loading' && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {requestStatus === 'sent' ? 'Anfrage gesendet ✓' : 'Kontakt anfragen'}
              </button>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
