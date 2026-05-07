'use client'

import { useEffect, useState } from 'react'
import { MapPin, Users, UserRoundX, ChevronDown } from 'lucide-react'
import { fetchApi } from '@/lib/api'

interface Profile {
  id: string
  user_id: string
  nickname: string
  birthdate: string
  city: string
  bio: string | null
  photo_id: string | null
  onboarding_completed: boolean
  is_published: boolean
}

interface ProfilesResponse {
  data: Profile[]
}

const INTERESTS = [
  'Alle Interessen',
  'Sport',
  'Musik',
  'Reisen',
  'Kochen',
  'Lesen',
  'Gaming',
  'Kunst',
]

function calcAge(birthdate: string): number {
  return Math.floor(
    (Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  )
}

type RequestStatus = 'idle' | 'loading' | 'sent' | 'error'

function ProfileCard({ profile }: { profile: Profile }) {
  const [status, setStatus] = useState<RequestStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleConnect() {
    setStatus('loading')
    setErrorMsg('')
    try {
      await fetchApi<unknown>('/chat/requests', {
        method: 'POST',
        body: JSON.stringify({ receiver_id: profile.user_id }),
      })
      setStatus('sent')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Anfrage fehlgeschlagen')
      setStatus('idle')
    }
  }

  const age = calcAge(profile.birthdate)

  return (
    <article
      className="rounded-2xl bg-surface-container border border-outline-variant overflow-hidden flex flex-col"
      aria-label={`Profil von ${profile.nickname}, ${age} Jahre`}
    >
      {/* Image placeholder */}
      <div
        className="aspect-[3/4] bg-surface-container-high flex items-center justify-center"
        aria-hidden="true"
      >
        <Users className="h-10 w-10 text-outline" />
      </div>

      {/* Info */}
      <div className="p-3 sm:p-4 flex flex-col gap-3 flex-1">
        <div>
          <p className="font-semibold text-on-surface text-sm sm:text-base leading-tight">
            {profile.nickname}, {age}
          </p>
          {profile.city && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-on-surface-variant flex-shrink-0" aria-hidden="true" />
              <p className="text-xs text-on-surface-variant truncate">{profile.city}</p>
            </div>
          )}
        </div>

        <div className="mt-auto space-y-2">
          {status === 'sent' ? (
            <div
              className="w-full py-2.5 rounded-full bg-surface-container-high text-primary-fixed-dim text-xs sm:text-sm font-semibold text-center"
              role="status"
              aria-live="polite"
            >
              Anfrage gesendet ✓
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={status === 'loading'}
              className="w-full py-2.5 rounded-full bg-primary-fixed-dim text-on-primary-container text-xs sm:text-sm font-semibold min-h-[44px] hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              aria-label={`Mit ${profile.nickname} verbinden`}
            >
              {status === 'loading' ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span
                    className="h-3.5 w-3.5 rounded-full border-2 border-on-primary-container/30 border-t-on-primary-container animate-spin"
                    aria-hidden="true"
                  />
                  Sende…
                </span>
              ) : (
                'Verbinden'
              )}
            </button>
          )}
          {errorMsg && (
            <p className="text-xs text-error text-center leading-tight" role="alert">
              {errorMsg}
            </p>
          )}
        </div>
      </div>
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

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cityFilter, setCityFilter] = useState('')
  const [interestFilter, setInterestFilter] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchApi<Profile[] | ProfilesResponse>('/profile/search')
        setProfiles(Array.isArray(res) ? res : (res?.data ?? []))
      } catch (err) {
        if (err instanceof Error && err.message === 'Session expired') return
        setError(err instanceof Error ? err.message : 'Fehler beim Laden')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 pb-24 sm:pb-8 space-y-5">

      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-on-surface">Entdecken</h1>

        {/* Filter bar */}
        <div className="flex gap-2 sm:gap-3">
          <div className="relative flex-1">
            <MapPin
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="Stadt"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-sm placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-fixed-dim min-h-[44px] transition-colors"
              aria-label="Nach Stadt filtern"
            />
          </div>

          <div className="relative">
            <select
              value={interestFilter}
              onChange={(e) => setInterestFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim min-h-[44px] transition-colors cursor-pointer"
              aria-label="Nach Interessen filtern"
            >
              {INTERESTS.map((interest) => (
                <option key={interest} value={interest === 'Alle Interessen' ? '' : interest}>
                  {interest}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {/* Grid / states */}
      {loading ? (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4"
          aria-label="Lädt Profile"
          aria-busy="true"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <div
          className="flex flex-col items-center justify-center py-20 text-center space-y-3"
          role="alert"
        >
          <UserRoundX className="h-12 w-12 text-error" aria-hidden="true" />
          <p className="text-on-surface font-semibold">Fehler beim Laden</p>
          <p className="text-on-surface-variant text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-sm min-h-[44px] hover:opacity-90 transition-opacity"
          >
            Erneut versuchen
          </button>
        </div>
      ) : profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <Users className="h-12 w-12 text-on-surface-variant" aria-hidden="true" />
          <p className="text-on-surface font-semibold">Keine Profile gefunden</p>
          <p className="text-on-surface-variant text-sm">Versuche andere Filtereinstellungen</p>
        </div>
      ) : (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4"
          role="list"
          aria-label="Entdeckte Profile"
        >
          {profiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}

    </main>
  )
}
