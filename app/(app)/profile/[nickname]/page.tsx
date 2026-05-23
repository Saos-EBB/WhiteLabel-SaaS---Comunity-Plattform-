'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MapPin, Loader2, AlertCircle, Flag, Ban } from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import { blurText } from '@/lib/profanity'
import { OnlineIndicator } from '@/components/ui/OnlineIndicator'
import AudioPlayer from '@/components/ui/AudioPlayer'
import ReportModal from '@/components/ui/ReportModal'
import { useConnectionAction, type ConnectionStatus } from '@/hooks/useConnectionAction'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicProfile {
  id: string
  user_id: string
  nickname: string
  birthdate: string | null
  bio: string | null
  city: string | null
  gender: string | null
  looking_for: string | null
  photo_id: string | null
  photo_url: string | null
  photo_needs_review: boolean
  audio_url: string | null
  is_online: boolean
  status_message: string | null
  connection_status?: ConnectionStatus
  request_id?: string | null
  conversation_id?: string | null
  public_id?: string | null
}

const GENDER_LABELS: Record<string, string> = {
  male:          'Mann',
  female:        'Frau',
  non_binary:    'Nicht-binär',
  diverse:       'Divers',
}

const LOOKING_FOR_LABELS: Record<string, string> = {
  friendship:   'Freundschaft',
  relationship: 'Beziehung',
  exchange:     'Austausch',
  all:          'Offen für alles',
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

  const [audioUrl, setAudioUrl]           = useState<string | null>(null)

  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false)
  const [reportOpen, setReportOpen]                 = useState(false)
  const [blockConfirmOpen, setBlockConfirmOpen]     = useState(false)

  const router = useRouter()
  const profanityFilter = useAuthStore((s) => (s.user as any)?.profanity_filter as boolean ?? true)
  const conn = useConnectionAction(
    profile?.user_id ?? '',
    profile?.connection_status ?? 'NONE',
    profile?.request_id ?? null,
    profile?.conversation_id ?? null,
  )

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
        if (prof.audio_url) {
          try { setAudioUrl(new URL(prof.audio_url).pathname) } catch { setAudioUrl(prof.audio_url) }
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
              {profile.public_id && (
                <p className="text-xs text-white/50 mt-0.5 font-mono">#ID-{profile.public_id}</p>
              )}
            </div>

            {/* Location + online — bottom right */}
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-xl">
              {profile.city && (
                <div className="flex items-center gap-1.5 text-white text-sm mb-1">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                  <span>{profile.city}</span>
                </div>
              )}
              <OnlineIndicator
                is_online={profile.is_online}
                status_message={profanityFilter && profile.status_message ? blurText(profile.status_message) : profile.status_message}
                size="sm"
              />
            </div>
          </div>

          {/* ── Gender / Looking for ───────────────────────────────────────── */}
          {(profile.gender && profile.gender !== 'not_specified' || profile.looking_for) && (
            <div className="w-full flex flex-wrap gap-2 mb-5">
              {profile.gender && profile.gender !== 'not_specified' && GENDER_LABELS[profile.gender] && (
                <span className="px-4 py-2 rounded-full bg-surface-container text-on-surface text-sm">
                  {GENDER_LABELS[profile.gender]}
                </span>
              )}
              {profile.looking_for && LOOKING_FOR_LABELS[profile.looking_for] && (
                <span className="px-4 py-2 rounded-full bg-surface-container text-on-surface text-sm">
                  {LOOKING_FOR_LABELS[profile.looking_for]}
                </span>
              )}
            </div>
          )}

          {/* ── Audio ────────────────────────────────────────────────────── */}
          {audioUrl && (
            <div className="w-full mb-5">
              <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide text-center mb-3">
                Vorstellung
              </p>
              <AudioPlayer src={audioUrl} />
            </div>
          )}

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

          {/* ── Actions (other profiles only) ─────────────────────────────── */}
          {!isOwnProfile && (
            <div className="w-full space-y-3">

              {conn.error && (
                <div className="flex items-center gap-2 rounded-xl bg-error-container text-error px-4 py-3 text-sm" role="alert">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {conn.error}
                </div>
              )}

              {/* Connection state */}
              {conn.connectionStatus === 'NONE' && (
                <button
                  onClick={() => conn.sendRequest()}
                  disabled={conn.isLoading}
                  className="w-full py-4 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {conn.isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Verbinden
                </button>
              )}

              {conn.connectionStatus === 'SENT' && (
                <div
                  className="w-full py-4 rounded-full bg-surface-container-high text-primary-fixed-dim font-semibold text-center"
                  role="status"
                  aria-live="polite"
                >
                  Ausstehend ✓
                </div>
              )}

              {conn.connectionStatus === 'RECEIVED' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => conn.acceptRequest()}
                    disabled={conn.isLoading}
                    className="flex-1 py-4 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {conn.isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    Annehmen
                  </button>
                  <button
                    onClick={() => conn.declineRequest()}
                    disabled={conn.isLoading}
                    className="flex-1 py-4 rounded-full border border-outline-variant text-on-surface font-semibold hover:bg-surface-container active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Ablehnen
                  </button>
                </div>
              )}

              {conn.connectionStatus === 'CONNECTED' && (
                <div className="space-y-2">
                  <div
                    className="w-full py-4 rounded-full bg-surface-container-high text-primary-fixed-dim font-semibold text-center"
                    role="status"
                    aria-live="polite"
                  >
                    Verbunden ✓
                  </div>
                  <button
                    onClick={() => conn.conversationId && router.push(`/chat/${conn.conversationId}`)}
                    disabled={!conn.conversationId}
                    className="w-full py-4 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Mit ${profile.nickname} chatten`}
                  >
                    Chatten →
                  </button>
                  <button
                    onClick={() => setDisconnectConfirmOpen(true)}
                    className="w-full py-4 rounded-full border border-outline-variant text-on-surface font-semibold hover:bg-surface-container active:scale-95 transition-all"
                  >
                    Trennen
                  </button>
                </div>
              )}

              {conn.connectionStatus === 'BLOCKED' && (
                <div className="space-y-2">
                  <div
                    className="w-full py-4 rounded-full bg-surface-container-high text-on-surface-variant font-semibold text-center"
                    role="status"
                  >
                    Blockiert
                  </div>
                  <button
                    onClick={() => conn.unblock()}
                    disabled={conn.isLoading}
                    className="w-full py-4 rounded-full border border-outline-variant text-on-surface-variant font-semibold hover:bg-surface-container active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {conn.isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    Entblocken
                  </button>
                </div>
              )}

              {/* Report button */}
              <button
                onClick={() => setReportOpen(true)}
                className="w-full py-3 rounded-full border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Flag className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                User melden
              </button>

              {/* Block button — hidden when already blocked */}
              {conn.connectionStatus !== 'BLOCKED' && (
                <button
                  onClick={() => setBlockConfirmOpen(true)}
                  className="w-full py-3 rounded-full border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Ban className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  Nutzer blockieren
                </button>
              )}
            </div>
          )}

          {/* Disconnect confirmation bottom sheet */}
          {disconnectConfirmOpen && (
            <>
              <div
                className="fixed inset-0 z-20 bg-black/50"
                onClick={() => !conn.isLoading && setDisconnectConfirmOpen(false)}
                aria-hidden="true"
              />
              <div
                className="fixed bottom-0 left-0 right-0 z-30 rounded-t-2xl bg-surface-container-high border-t border-outline-variant p-6 space-y-4"
                role="dialog"
                aria-modal="true"
                aria-label="Verbindung trennen"
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="font-semibold text-on-surface">Verbindung trennen?</p>
                  <p className="text-sm text-on-surface-variant">
                    Der gemeinsame Chat wird für beide Seiten gelöscht und kann nicht wiederhergestellt werden.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row-reverse">
                  <button
                    onClick={async () => { if (await conn.disconnect()) setDisconnectConfirmOpen(false) }}
                    disabled={conn.isLoading}
                    className="flex-1 py-3 rounded-full bg-error-container text-error font-semibold text-sm min-h-[44px] hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {conn.isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                    Trennen
                  </button>
                  <button
                    onClick={() => setDisconnectConfirmOpen(false)}
                    disabled={conn.isLoading}
                    className="flex-1 py-3 rounded-full border border-outline-variant text-on-surface font-semibold text-sm min-h-[44px] hover:bg-surface-container active:scale-95 disabled:opacity-50 transition-all"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Block user confirmation bottom sheet */}
          {blockConfirmOpen && (
            <>
              <div
                className="fixed inset-0 z-20 bg-black/50"
                onClick={() => !conn.isLoading && setBlockConfirmOpen(false)}
                aria-hidden="true"
              />
              <div
                className="fixed bottom-0 left-0 right-0 z-30 rounded-t-2xl bg-surface-container-high border-t border-outline-variant p-6 space-y-4"
                role="dialog"
                aria-modal="true"
                aria-label="Nutzer blockieren"
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="font-semibold text-on-surface">Nutzer blockieren?</p>
                  <p className="text-sm text-on-surface-variant">
                    Der Nutzer wird aus deiner Suche entfernt. Du kannst ihm keine Nachrichten mehr senden. Diese Aktion kann rückgängig gemacht werden.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row-reverse">
                  <button
                    onClick={async () => { if (await conn.block()) setBlockConfirmOpen(false) }}
                    disabled={conn.isLoading}
                    className="flex-1 py-3 rounded-full bg-error-container text-error font-semibold text-sm min-h-[44px] hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {conn.isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                    Blockieren
                  </button>
                  <button
                    onClick={() => setBlockConfirmOpen(false)}
                    disabled={conn.isLoading}
                    className="flex-1 py-3 rounded-full border border-outline-variant text-on-surface font-semibold text-sm min-h-[44px] hover:bg-surface-container active:scale-95 disabled:opacity-50 transition-all"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Report modal */}
          {reportOpen && (
            <ReportModal
              reportedUserId={profile.user_id}
              onClose={() => setReportOpen(false)}
            />
          )}

        </div>
      </div>
    </main>
  )
}
