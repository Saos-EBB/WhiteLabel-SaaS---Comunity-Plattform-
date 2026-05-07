'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, User } from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'

interface Conversation {
  id: string
  user_a_id: string
  user_b_id: string
  status: string
  last_message_at: string | null
  created_at: string
}

type ConvEnvelope = Conversation[] | { data: Conversation[] }

function normalise<T>(res: T[] | { data: T[] }): T[] {
  return Array.isArray(res) ? res : ((res as { data: T[] })?.data ?? [])
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const secs = Math.floor(diff / 1000)
  const mins = Math.floor(secs / 60)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)

  if (secs < 60) return 'Gerade eben'
  if (mins < 60) return `vor ${mins} Min.`
  if (hours < 24) return `vor ${hours} Std.`
  if (days < 7) return `vor ${days} Tag${days === 1 ? '' : 'en'}`
  return new Date(dateStr).toLocaleDateString('de-DE')
}

function shortId(id: string): string {
  return `Nutzer ${id.slice(0, 6).toUpperCase()}`
}

function SkeletonItem() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="flex-shrink-0 h-12 w-12 rounded-full bg-surface-container-high" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="flex justify-between gap-2">
          <div className="h-3.5 w-32 rounded-lg bg-surface-container-high" />
          <div className="h-3 w-14 rounded-lg bg-surface-container-high" />
        </div>
        <div className="h-3 w-48 rounded-lg bg-surface-container-high" />
      </div>
    </div>
  )
}

export default function ChatPage() {
  const currentUserId = useAuthStore((s) => (s.user as any)?.user_id ?? s.user?.id)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [nicknames, setNicknames] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchApi<ConvEnvelope>('/chat/conversations')
        const convs = normalise(res)
        setConversations(convs)

        const myId = (useAuthStore.getState().user as any)?.user_id ?? useAuthStore.getState().user?.id
        const partnerIds = [...new Set(convs.map((c) => c.user_a_id === myId ? c.user_b_id : c.user_a_id))]
        const profiles = await Promise.all(
          partnerIds.map((pid) =>
            fetchApi<{ nickname: string }>(`/profile/user/${pid}`).catch(() => null)
          )
        )
        const map = new Map<string, string>()
        partnerIds.forEach((pid, i) => {
          const p = profiles[i]
          if (p) map.set(pid, p.nickname)
        })
        setNicknames(map)
      } catch (err) {
        if (err instanceof Error && err.message === 'Session expired') return
        setError(err instanceof Error ? err.message : 'Fehler beim Laden')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function getPartnerId(conv: Conversation): string {
    return conv.user_a_id === currentUserId ? conv.user_b_id : conv.user_a_id
  }

  return (
    <main className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6">
        <h1 className="text-2xl font-bold text-on-surface">Nachrichten</h1>
      </div>

      {loading ? (
        <div className="divide-y divide-outline-variant mt-2" aria-busy="true" aria-label="Lädt Gespräche">
          {[0, 1, 2, 3].map((i) => <SkeletonItem key={i} />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 px-6" role="alert">
          <p className="text-on-surface font-semibold">Fehler beim Laden</p>
          <p className="text-on-surface-variant text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-sm min-h-[44px] hover:opacity-90 transition-opacity"
          >
            Erneut versuchen
          </button>
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-2 px-6">
          <MessageCircle className="h-10 w-10 text-on-surface-variant" aria-hidden="true" />
          <p className="text-on-surface font-semibold">Noch keine Gespräche</p>
          <p className="text-on-surface-variant text-sm">
            Verbinde dich mit anderen Nutzern, um zu chatten
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-outline-variant mt-2" aria-label="Gespräche">
          {conversations.map((conv) => {
            const partnerId = getPartnerId(conv)
            const ts = conv.last_message_at ?? conv.created_at
            return (
              <li key={conv.id}>
                <Link
                  href={`/chat/${conv.id}`}
                  className="flex items-center gap-3 px-4 py-3 sm:px-6 hover:bg-surface-container-low active:bg-surface-container transition-colors min-h-[72px]"
                  aria-label={`Gespräch mit ${nicknames.get(partnerId) ?? shortId(partnerId)}, ${relativeTime(ts)}`}
                >
                  <div
                    className="flex-shrink-0 h-12 w-12 rounded-full bg-surface-container-high flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <User className="h-6 w-6 text-outline" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-semibold text-on-surface text-sm truncate">
                        {nicknames.get(partnerId) ?? shortId(partnerId)}
                      </p>
                      <time
                        className="text-xs text-on-surface-variant flex-shrink-0"
                        dateTime={ts}
                      >
                        {relativeTime(ts)}
                      </time>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                      Gespräch starten
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
