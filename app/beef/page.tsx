'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useHiddenStore } from '@/lib/store/hiddenStore'
import { useAuthStore } from '@/lib/store/authStore'
import { fetchApi } from '@/lib/api'
import { Flame, Swords, Trophy, Users } from 'lucide-react'

type BeefStatus = 'pending_approval'|'waiting'|'active'|'closed'|'chickened'

interface Beef {
  id: string
  initiator_id: string
  target_id: string
  tldr: string
  chat_passage: string
  status: BeefStatus
  winner_id: string | null
  ends_at: string | null
  created_at: string
}

type Tab = 'requests' | 'mine' | 'public' | 'highscore'

export default function BeefPage() {
  const router   = useRouter()
  const isHidden = useHiddenStore((s) => s.isHidden)
  const token    = useAuthStore((s) => s.accessToken)

  const [hydrated, setHydrated] = useState(false)
  const [tab, setTab]                   = useState<Tab>('requests')
  const [requests, setRequests]         = useState<Beef[]>([])
  const [myBeefs, setMyBeefs]           = useState<Beef[]>([])
  const [publicBeefs, setPublicBeefs]   = useState<Beef[]>([])
  const [loading, setLoading]           = useState(true)
  const [responding, setResponding]     = useState<string | null>(null)
  const [highscore, setHighscore]       = useState<{
    user_id: string; nickname: string; wins: string
  }[]>([])

  useEffect(() => {
    if (useHiddenStore.persist.hasHydrated()) setHydrated(true)
    const unsub = useHiddenStore.persist.onFinishHydration(() => setHydrated(true))
    return unsub
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!isHidden) { router.replace('/dashboard'); return }
  }, [hydrated, isHidden, router])

  const load = useCallback(async () => {
    if (!isHidden) return
    setLoading(true)
    try {
      const [req, mine, pub, hs] = await Promise.all([
        fetchApi<Beef[]>('/hidden/beef/incoming'),
        fetchApi<Beef[]>('/hidden/beef/my-active'),
        fetchApi<Beef[]>('/hidden/beef/public'),
        fetchApi<any[]>('/hidden/beef/highscore'),
      ])
      setRequests(Array.isArray(req) ? req : [])
      setMyBeefs(Array.isArray(mine) ? mine : [])
      setPublicBeefs(Array.isArray(pub) ? pub : [])
      setHighscore(Array.isArray(hs) ? hs : [])
    } catch { /* non-critical */ }
    finally { setLoading(false) }
  }, [isHidden])

  useEffect(() => { load() }, [load])

  // Handle Stripe coin-purchase redirect
  useEffect(() => {
    const params    = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    const uid       = params.get('uid')
    if (!sessionId || !uid) return

    fetchApi('/hidden/coin/confirm', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    }).then(() => {
      window.history.replaceState({}, '', '/beef')
      window.dispatchEvent(new Event('coin-balance-refresh'))
    }).catch(() => {})
  }, [])

  async function respond(beefId: string, response: 'fight' | 'chicken') {
    setResponding(beefId)
    try {
      await fetchApi(`/hidden/beef/${beefId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ response }),
      })
      await load()
    } catch { /* ignore */ }
    finally { setResponding(null) }
  }

  if (!hydrated) return null   // still hydrating, render nothing
  if (!isHidden) return null

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'requests',  label: 'Anfragen',    icon: <Swords size={15}/> },
    { key: 'mine',      label: 'Meine Beefs', icon: <Flame size={15}/> },
    { key: 'public',    label: 'Public',      icon: <Users size={15}/> },
    { key: 'highscore', label: 'Highscore',   icon: <Trophy size={15}/> },
  ]

  return (
    <div className="max-w-screen-sm mx-auto px-4 py-6 pb-24">

      {/* Page title */}
      <div className="flex items-center gap-3 mb-6">
        <Swords size={24} className="text-primary-fixed-dim"/>
        <h1 className="text-xl font-bold text-on-surface">Beef Zone</h1>
        {requests.length > 0 && (
          <span className="ml-auto bg-error text-on-error text-xs
            font-bold px-2 py-0.5 rounded-full">
            {requests.length}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm
              font-semibold transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'text-primary-fixed-dim border-primary-fixed-dim'
                : 'text-on-surface-variant border-transparent hover:text-on-surface'
            }`}
          >
            {t.icon} {t.label}
            {t.key === 'requests' && requests.length > 0 && (
              <span className="bg-error text-on-error text-[10px]
                font-bold px-1.5 rounded-full">
                {requests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary-fixed-dim
            border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : (

        <>
          {/* REQUESTS TAB */}
          {tab === 'requests' && (
            <div className="flex flex-col gap-4">
              {requests.length === 0 ? (
                <div className="text-center py-16 text-on-surface-variant">
                  <Swords size={40} className="mx-auto mb-3 opacity-30"/>
                  <p className="text-sm">Keine offenen Beef-Anfragen</p>
                </div>
              ) : requests.map(beef => (
                <div key={beef.id}
                  className="bg-surface-container border border-outline-variant
                    rounded-2xl p-5 flex flex-col gap-4">
                  <div>
                    <span className="text-xs text-on-surface-variant uppercase
                      tracking-widest font-mono">Beef Anfrage</span>
                    <p className="font-bold text-on-surface mt-1 text-lg">
                      {beef.tldr}
                    </p>
                  </div>
                  <div className="bg-surface-container-low rounded-xl p-3
                    border-l-2 border-primary-fixed-dim">
                    <p className="text-xs text-on-surface-variant mb-1">
                      Passage
                    </p>
                    <p className="text-sm text-on-surface-variant italic leading-relaxed">
                      {beef.chat_passage}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => respond(beef.id, 'fight')}
                      disabled={responding === beef.id}
                      className="flex-1 py-3 rounded-xl bg-primary-fixed-dim
                        text-on-primary-container font-bold text-sm
                        disabled:opacity-40 transition-opacity"
                    >
                      🥊 Fight
                    </button>
                    <button
                      onClick={() => respond(beef.id, 'chicken')}
                      disabled={responding === beef.id}
                      className="flex-1 py-3 rounded-xl bg-surface-container-high
                        border border-outline-variant text-on-surface-variant
                        font-bold text-sm disabled:opacity-40 transition-opacity"
                    >
                      🐔 Chicken
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MINE TAB */}
          {tab === 'mine' && (
            <div className="flex flex-col gap-4">
              {myBeefs.length === 0 ? (
                <div className="text-center py-16 text-on-surface-variant">
                  <Flame size={40} className="mx-auto mb-3 opacity-30"/>
                  <p className="text-sm">Keine laufenden Beefs gerade</p>
                </div>
              ) : myBeefs.map(beef => (
                <Link key={beef.id} href={`/beef/${beef.id}`} className="block">
                  <div className="bg-surface-container border-2 border-primary-fixed-dim
                    rounded-2xl p-5 flex flex-col gap-3 hover:border-primary-fixed-dim
                    transition-colors cursor-pointer">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-primary-fixed-dim font-bold
                          uppercase tracking-widest font-mono">
                          Du bist dabei
                        </span>
                        <p className="font-bold text-on-surface">{beef.tldr}</p>
                      </div>
                      {beef.ends_at && (
                        <span className="text-xs text-on-surface-variant
                          bg-surface-container-high px-2 py-0.5 rounded-full
                          whitespace-nowrap flex-shrink-0">
                          🕐 läuft
                        </span>
                      )}
                    </div>
                    <div className="bg-surface-container-low rounded-xl p-3
                      border-l-2 border-primary-fixed-dim">
                      <p className="text-sm text-on-surface-variant italic
                        leading-relaxed line-clamp-3">
                        {beef.chat_passage}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* PUBLIC TAB */}
          {tab === 'public' && (
            <div className="flex flex-col gap-4">
              {publicBeefs.length === 0 ? (
                <div className="text-center py-16 text-on-surface-variant">
                  <Users size={40} className="mx-auto mb-3 opacity-30"/>
                  <p className="text-sm">Keine aktiven Beefs gerade</p>
                </div>
              ) : publicBeefs.map(beef => (
                <Link key={beef.id} href={`/beef/${beef.id}`} className="block">
                  <div className="bg-surface-container border border-outline-variant
                    rounded-2xl p-5 flex flex-col gap-3 hover:border-outline
                    transition-colors cursor-pointer">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-on-surface">{beef.tldr}</p>
                      {beef.ends_at && (
                        <span className="text-xs text-on-surface-variant
                          bg-surface-container-high px-2 py-0.5 rounded-full
                          whitespace-nowrap flex-shrink-0">
                          🕐 läuft
                        </span>
                      )}
                    </div>
                    <div className="bg-surface-container-low rounded-xl p-3
                      border-l-2 border-outline-variant">
                      <p className="text-sm text-on-surface-variant italic
                        leading-relaxed line-clamp-3">
                        {beef.chat_passage}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* HIGHSCORE TAB */}
          {tab === 'highscore' && (
            <div className="flex flex-col gap-3">
              <h2 className="font-bold text-on-surface flex items-center gap-2">
                <Trophy size={18} className="text-primary-fixed-dim"/>
                Slain Enemies
              </h2>
              {highscore.length === 0 ? (
                <div className="text-center py-16 text-on-surface-variant">
                  <Trophy size={40} className="mx-auto mb-3 opacity-30"/>
                  <p className="text-sm">Noch keine Beefs beendet</p>
                </div>
              ) : highscore.map((row, i) => (
                <div key={row.user_id}
                  className="flex items-center gap-4 bg-surface-container border border-outline-variant rounded-2xl px-5 py-4">
                  <span className={`text-lg font-bold tabular-nums w-8 text-center ${
                    i === 0 ? 'text-yellow-400' :
                    i === 1 ? 'text-slate-400' :
                    i === 2 ? 'text-amber-600' : 'text-on-surface-variant'
                  }`}>
                    #{i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-on-surface text-sm">{row.nickname}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-fixed-dim tabular-nums">
                      {row.wins}
                    </p>
                    <p className="text-xs text-on-surface-variant">Wins</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
