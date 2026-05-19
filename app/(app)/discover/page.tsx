'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MapPin, Users, UserRoundX, ChevronDown } from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { OnlineIndicator } from '@/components/ui/OnlineIndicator'

interface ProfileInterest {
  id: string
  name_de: string
  category: string | null
}

interface Profile {
  id: string
  user_id: string
  nickname: string
  birthdate: string
  city: string | null
  bio: string | null
  photo_id: string | null
  photo_url: string | null
  is_online: boolean
  status_message: string | null
  gender: string | null
  looking_for: string | null
  interests: ProfileInterest[]
  onboarding_completed: boolean
  is_published: boolean
}

interface ProfilesResponse {
  data: Profile[]
}

const DEFAULT_FILTERS = {
  city: '',
  gender: '',
  looking_for: '',
  min_age: '',
  max_age: '',
  online_only: false,
}

function calcAge(birthdate: string): number {
  return Math.floor(
    (Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  )
}

function buildQuery(f: typeof DEFAULT_FILTERS): string {
  const params = new URLSearchParams()
  if (f.city.trim())   params.set('city', f.city.trim())
  if (f.gender)        params.set('gender', f.gender)
  if (f.looking_for)   params.set('looking_for', f.looking_for)
  if (f.min_age)       params.set('min_age', f.min_age)
  if (f.max_age)       params.set('max_age', f.max_age)
  if (f.online_only)   params.set('online_only', 'true')
  const qs = params.toString()
  return qs ? `/profile/search?${qs}` : '/profile/search'
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
      {/* Photo or placeholder */}
      <div
        className="aspect-[3/4] bg-surface-container-high flex items-center justify-center overflow-hidden relative"
        aria-hidden="true"
      >
        {profile.photo_url ? (
          <img src={profile.photo_url.replace('http://localhost:3000', '')} alt="" className="h-full w-full object-cover" />
        ) : (
          <Users className="h-10 w-10 text-outline" />
        )}
        {profile.is_online && (
          <span
            className="absolute bottom-2 right-2 h-3.5 w-3.5 rounded-full bg-green-400 ring-2 ring-surface-container"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Info */}
      <div className="p-3 sm:p-4 flex flex-col gap-3 flex-1">
        <div>
          <p className="font-semibold text-on-surface text-sm sm:text-base leading-tight">
            <Link href={`/profile/${profile.nickname}`} className="hover:underline cursor-pointer">
              {profile.nickname}
            </Link>
            {`, ${age}`}
          </p>
          {profile.city && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-on-surface-variant flex-shrink-0" aria-hidden="true" />
              <p className="text-xs text-on-surface-variant truncate">{profile.city}</p>
            </div>
          )}
          {profile.status_message && (
            <div className="mt-1">
              <OnlineIndicator
                is_online={profile.is_online}
                status_message={profile.status_message}
                size="sm"
              />
            </div>
          )}
        </div>

        {profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {profile.interests.slice(0, 3).map((i) => (
              <span
                key={i.id}
                className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-medium"
              >
                {i.name_de}
              </span>
            ))}
          </div>
        )}

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
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [filters, setFilters]   = useState(DEFAULT_FILTERS)

  async function loadProfiles(f: typeof DEFAULT_FILTERS) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchApi<Profile[] | ProfilesResponse>(buildQuery(f))
      setProfiles(Array.isArray(res) ? res : (res?.data ?? []))
    } catch (err) {
      if (err instanceof Error && err.message === 'Session expired') return
      setError(err instanceof Error ? err.message : 'Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProfiles(DEFAULT_FILTERS) }, [])

  function handleApply() { loadProfiles(filters) }

  function handleReset() {
    setFilters(DEFAULT_FILTERS)
    loadProfiles(DEFAULT_FILTERS)
  }

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 pb-24 sm:pb-8 space-y-5">

      {/* Header + filter panel */}
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-on-surface">Entdecken</h1>

        <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 space-y-3">

          {/* Row 1: City · Gender · Suche nach */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">

            {/* City — full width on mobile */}
            <div className="col-span-2 relative">
              <MapPin
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={filters.city}
                onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                placeholder="Stadt"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-fixed-dim min-h-[44px] transition-colors"
                aria-label="Nach Stadt filtern"
              />
            </div>

            {/* Gender */}
            <div className="relative">
              <select
                value={filters.gender}
                onChange={(e) => setFilters(f => ({ ...f, gender: e.target.value }))}
                className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim min-h-[44px] transition-colors cursor-pointer"
                aria-label="Nach Geschlecht filtern"
              >
                <option value="">Alle</option>
                <option value="male">Mann</option>
                <option value="female">Frau</option>
                <option value="non_binary">Non-Binary</option>
                <option value="diverse">Divers</option>
                <option value="not_specified">Keine Angabe</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none" aria-hidden="true" />
            </div>

            {/* Looking for */}
            <div className="relative">
              <select
                value={filters.looking_for}
                onChange={(e) => setFilters(f => ({ ...f, looking_for: e.target.value }))}
                className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim min-h-[44px] transition-colors cursor-pointer"
                aria-label="Nach Suchanliegen filtern"
              >
                <option value="">Alle</option>
                <option value="friendship">Freundschaft</option>
                <option value="relationship">Beziehung</option>
                <option value="exchange">Austausch</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none" aria-hidden="true" />
            </div>
          </div>

          {/* Row 2: Age range · Online toggle · Buttons */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Age inputs */}
            <input
              type="number"
              value={filters.min_age}
              onChange={(e) => setFilters(f => ({ ...f, min_age: e.target.value }))}
              placeholder="Alter von"
              min={18}
              max={99}
              className="w-[7.5rem] px-3 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-fixed-dim min-h-[44px] transition-colors"
              aria-label="Mindestalter"
            />
            <span className="text-on-surface-variant text-sm" aria-hidden="true">–</span>
            <input
              type="number"
              value={filters.max_age}
              onChange={(e) => setFilters(f => ({ ...f, max_age: e.target.value }))}
              placeholder="Alter bis"
              min={18}
              max={99}
              className="w-[7.5rem] px-3 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-fixed-dim min-h-[44px] transition-colors"
              aria-label="Höchstalter"
            />

            {/* Online toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none ml-1">
              <input
                type="checkbox"
                checked={filters.online_only}
                onChange={(e) => setFilters(f => ({ ...f, online_only: e.target.checked }))}
                className="sr-only"
              />
              <span
                className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                  filters.online_only ? 'bg-primary-fixed-dim' : 'bg-surface-container-highest'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-sm ring-0 transition duration-200 ease-in-out ${
                    filters.online_only ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </span>
              <span className="text-sm text-on-surface whitespace-nowrap">Online jetzt</span>
            </label>

            {/* Push buttons to the right */}
            <div className="flex-1" />

            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-full border border-outline-variant text-on-surface-variant text-sm font-medium min-h-[44px] hover:bg-surface-container-high transition-colors"
            >
              Zurücksetzen
            </button>
            <button
              onClick={handleApply}
              disabled={loading}
              className="px-4 py-2.5 rounded-full bg-primary-fixed-dim text-on-primary-container text-sm font-semibold min-h-[44px] hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Filter anwenden
            </button>
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
            onClick={() => loadProfiles(filters)}
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
