'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Pencil, Loader2, AlertCircle } from 'lucide-react'
import { fetchApi } from '@/lib/api'

interface PublicProfile {
  id: string
  nickname: string
  bio: string | null
  city: string | null
  photo_id: string | null
}

export default function PublicProfilePage() {
  const { nickname } = useParams<{ nickname: string }>()

  const [profile, setProfile]         = useState<PublicProfile | null>(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [loading, setLoading]         = useState(true)
  const [notFound, setNotFound]       = useState(false)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [pubResult, ownResult] = await Promise.allSettled([
          fetchApi<PublicProfile>(`/profile/${encodeURIComponent(nickname)}`),
          fetchApi<{ nickname: string }>('/profile/me'),
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

        setProfile(pubResult.value)

        if (ownResult.status === 'fulfilled') {
          setIsOwnProfile(ownResult.value.nickname === nickname)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [nickname])

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

  const initial = profile.nickname.charAt(0).toUpperCase()

  return (
    <main className="min-h-screen bg-background pb-24 md:pb-8">
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-10 space-y-6">

        {/* Avatar, name, location, edit */}
        <div className="flex flex-col items-center gap-4 text-center">

          {/* Avatar */}
          <div
            className="h-28 w-28 rounded-full bg-primary-fixed-dim flex items-center justify-center flex-shrink-0"
            aria-hidden="true"
          >
            <span className="text-4xl font-bold text-on-primary-container select-none">
              {initial}
            </span>
          </div>

          {/* Nickname + city */}
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-on-surface">{profile.nickname}</h1>
            {profile.city && (
              <div className="flex items-center justify-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-on-surface-variant flex-shrink-0" aria-hidden="true" />
                <p className="text-sm text-on-surface-variant">{profile.city}</p>
              </div>
            )}
          </div>

          {/* Edit button — only for own profile */}
          {isOwnProfile && (
            <Link
              href="/profile"
              className="flex items-center gap-1.5 px-5 py-2 rounded-full border border-outline-variant text-on-surface text-sm font-medium hover:bg-surface-container transition-colors min-h-[40px]"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Bearbeiten
            </Link>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5">
            <p className="text-sm leading-relaxed text-on-surface">{profile.bio}</p>
          </div>
        )}

      </div>
    </main>
  )
}
