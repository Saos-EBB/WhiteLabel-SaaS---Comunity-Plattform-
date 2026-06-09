'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, MapPin, Calendar, AlertCircle } from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'

interface MatchListItem {
  match_id: string
  conversation_id: string | null
  matched_at: string
  nickname: string
  age: number | null
  city: string | null
  photo_url: string | null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function toProxyUrl(url: string | null): string | null {
  if (!url) return null
  return url.replace('http://localhost:3000', '')
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container animate-pulse">
      <div className="w-16 h-16 rounded-full bg-surface-variant flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 bg-surface-variant rounded" />
        <div className="h-3 w-1/2 bg-surface-variant rounded" />
        <div className="h-3 w-1/4 bg-surface-variant rounded" />
      </div>
      <div className="h-9 w-24 bg-surface-variant rounded-xl" />
    </div>
  )
}

function MatchCard({ match }: { match: MatchListItem }) {
  const { t } = useTranslation()
  const router = useRouter()

  const dateLabel = t.matches.matchedOn.replace('{date}', formatDate(match.matched_at))
  const photoSrc = toProxyUrl(match.photo_url)
  const canChat = !!match.conversation_id

  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container">
      <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-surface-variant">
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoSrc}
            alt={match.nickname}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Heart className="h-6 w-6 text-on-surface-variant" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-on-surface truncate">
          {match.nickname}
          {match.age != null && (
            <span className="font-normal text-on-surface-variant">, {match.age}</span>
          )}
        </p>
        {match.city && (
          <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
            <MapPin size={11} aria-hidden />
            <span>{match.city}</span>
          </p>
        )}
        <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
          <Calendar size={11} aria-hidden />
          <span>{dateLabel}</span>
        </p>
      </div>

      <button
        onClick={() => canChat && router.push(`/chat/${match.conversation_id}`)}
        disabled={!canChat}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-opacity
          disabled:opacity-40 disabled:cursor-not-allowed
          bg-primary text-on-primary hover:opacity-90"
        title={canChat ? undefined : t.matches.chatUnavailable}
      >
        <MessageCircle size={14} aria-hidden />
        <span className="hidden sm:inline">
          {canChat ? t.matches.openChat : t.matches.chatUnavailable}
        </span>
      </button>
    </div>
  )
}

export default function MatchesPage() {
  const { t } = useTranslation()
  const [matches, setMatches] = useState<MatchListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  async function load() {
    setLoading(true)
    setError(false)
    try {
      const data = await fetchApi<MatchListItem[]>('/discover/matches')
      setMatches(Array.isArray(data) ? data : [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <main className="min-h-screen bg-background pb-24 sm:pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold text-on-surface mb-6">{t.matches.title}</h1>

        {loading && (
          <div className="space-y-3" aria-busy="true" aria-label={t.common.loading}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <AlertCircle className="h-12 w-12 text-error" aria-hidden />
            <p className="text-on-surface-variant text-sm">{t.matches.loadError}</p>
            <button
              onClick={load}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-primary text-on-primary"
            >
              {t.common.retry}
            </button>
          </div>
        )}

        {!loading && !error && matches.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Heart className="h-14 w-14 text-primary-fixed-dim" fill="currentColor" aria-hidden />
            <h2 className="text-lg font-semibold text-on-surface">{t.matches.empty}</h2>
            <p className="text-on-surface-variant text-sm max-w-xs">{t.matches.emptyDesc}</p>
          </div>
        )}

        {!loading && !error && matches.length > 0 && (
          <div className="space-y-3">
            {matches.map(m => (
              <MatchCard key={m.match_id} match={m} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
