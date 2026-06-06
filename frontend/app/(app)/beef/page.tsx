'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useHiddenStore } from '@/lib/store/hiddenStore'
import { useAuthStore } from '@/lib/store/authStore'
import { fetchApi } from '@/lib/api'
import { Flame, Swords, Trophy, Users, Plus, X, Search } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

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

type Tab = 'requests' | 'mine' | 'public' | 'highscore' | 'create'

type GameType = 'rps' | 'tictactoe' | 'mastermind' | 'reaction'

interface UserSearchResult {
  user_id: string
  nickname: string
  photo_url: string | null
}

interface CreateBeefForm {
  targetUserId: string
  targetNickname: string
  tldr: string
  chatPassage: string
  gameType: GameType
}

const GAME_OPTIONS: { value: GameType; label: string; desc: string; emoji: string }[] = [
  { value: 'rps',        label: 'Rock Paper Scissors', desc: 'Klassisch — Stein Papier Schere',      emoji: '✊' },
  { value: 'tictactoe', label: 'Tic Tac Toe',          desc: 'Best of 3 — X vs O',                  emoji: '⬛' },
  { value: 'mastermind', label: 'Mastermind',           desc: 'Knack den Code — 4 Farben, 10 Runden', emoji: '🎨' },
  { value: 'reaction',  label: 'Reaktionstest',         desc: 'Wer drückt schneller auf GO!',         emoji: '⚡' },
]

export default function BeefPage() {
  const { t } = useTranslation()
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
  const [coinError, setCoinError]       = useState<string | null>(null)
  const [coinSuccess, setCoinSuccess]   = useState<number | null>(null)
  const [highscore, setHighscore]       = useState<{
    user_id: string; nickname: string; wins: string
  }[]>([])

  // CreateBeef state
  const [createForm, setCreateForm]       = useState<CreateBeefForm>({
    targetUserId: '',
    targetNickname: '',
    tldr: '',
    chatPassage: '',
    gameType: 'rps',
  })
  const [userSearch, setUserSearch]       = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching]         = useState(false)
  const [creating, setCreating]           = useState(false)
  const [createError, setCreateError]     = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState(false)

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

    fetchApi<{ coins: number }>('/hidden/coin/confirm', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    }).then((res) => {
      window.history.replaceState({}, '', '/beef')
      window.dispatchEvent(new Event('coin-balance-refresh'))
      setCoinSuccess(res.coins)
      const returnUrl = localStorage.getItem('coin_return_url') ?? '/beef'
      localStorage.removeItem('coin_return_url')
      setTimeout(() => router.push(returnUrl), 2500)
    }).catch(() => {
      setCoinError('Coin-Kauf konnte nicht gutgeschrieben werden. Bitte Support kontaktieren.')
    })
  }, [])

  async function searchUsers(query: string) {
    if (query.length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const results = await fetchApi<UserSearchResult[]>(`/profile/search?q=${encodeURIComponent(query)}&limit=8`)
      setSearchResults(Array.isArray(results) ? results : [])
    } catch { setSearchResults([]) }
    finally { setSearching(false) }
  }

  async function handleCreate() {
    if (!createForm.targetUserId || !createForm.tldr.trim() || !createForm.chatPassage.trim() || creating) return
    setCreating(true)
    setCreateError(null)
    try {
      await fetchApi('/hidden/beef', {
        method: 'POST',
        body: JSON.stringify({
          target_user_id: createForm.targetUserId,
          tldr: createForm.tldr.trim(),
          chat_passage: createForm.chatPassage.trim(),
          game_type: createForm.gameType,
        }),
      })
      setCreateSuccess(true)
      setCreateForm({ targetUserId: '', targetNickname: '', tldr: '', chatPassage: '', gameType: 'rps' })
      setUserSearch('')
      setSearchResults([])
      await load()
      setTimeout(() => { setCreateSuccess(false); setTab('mine') }, 2000)
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Fehler beim Erstellen')
    } finally { setCreating(false) }
  }

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
    { key: 'requests',  label: t.beef.tabRequests,  icon: <Swords size={15}/> },
    { key: 'mine',      label: t.beef.tabMine,      icon: <Flame size={15}/> },
    { key: 'public',    label: t.beef.tabPublic,    icon: <Users size={15}/> },
    { key: 'highscore', label: t.beef.tabHighscore, icon: <Trophy size={15}/> },
    { key: 'create',    label: 'Beef starten',       icon: <Plus size={15}/> },
  ]

  return (
    <div className="max-w-screen-sm mx-auto px-4 py-6 pb-24">

      {/* Coin purchase success */}
      {coinSuccess !== null && (
        <div className="mb-4 rounded-lg bg-tertiary-container text-on-tertiary-container text-sm px-4 py-3 flex items-center gap-2">
          <span className="text-base">🪙</span>
          <span>{t.beef.coinsCredited.replace('{coins}', String(coinSuccess))}</span>
        </div>
      )}

      {/* Coin purchase error */}
      {coinError && (
        <div className="mb-4 rounded-lg bg-error-container text-on-error-container text-sm px-4 py-3">
          {coinError}
        </div>
      )}

      {/* Page title */}
      <div className="flex items-center gap-3 mb-6">
        <Swords size={24} className="text-primary-fixed-dim"/>
        <h1 className="text-xl font-bold text-on-surface">{t.beef.title}</h1>
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
                  <p className="text-sm">{t.beef.noRequests}</p>
                </div>
              ) : requests.map(beef => (
                <div key={beef.id}
                  className="bg-surface-container border border-outline-variant
                    rounded-2xl p-5 flex flex-col gap-4">
                  <div>
                    <span className="text-xs text-on-surface-variant uppercase
                      tracking-widest font-mono">{t.beef.beefRequest}</span>
                    <p className="font-bold text-on-surface mt-1 text-lg">
                      {beef.tldr}
                    </p>
                  </div>
                  <div className="bg-surface-container-low rounded-xl p-3
                    border-l-2 border-primary-fixed-dim">
                    <p className="text-xs text-on-surface-variant mb-1">
                      {t.beef.passageLabel}
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
                  <p className="text-sm">{t.beef.noMine}</p>
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
                          {t.beef.inProgress}
                        </span>
                        <p className="font-bold text-on-surface">{beef.tldr}</p>
                      </div>
                      {beef.ends_at && (
                        <span className="text-xs text-on-surface-variant
                          bg-surface-container-high px-2 py-0.5 rounded-full
                          whitespace-nowrap flex-shrink-0">
                          {t.beef.running}
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
                  <p className="text-sm">{t.beef.noPublic}</p>
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
                          {t.beef.running}
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
                {t.beef.slainEnemies}
              </h2>
              {highscore.length === 0 ? (
                <div className="text-center py-16 text-on-surface-variant">
                  <Trophy size={40} className="mx-auto mb-3 opacity-30"/>
                  <p className="text-sm">{t.beef.noHighscore}</p>
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
                    <p className="text-xs text-on-surface-variant">{t.beef.wins}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CREATE TAB */}
          {tab === 'create' && (
            <div className="flex flex-col gap-5">

              {/* Success banner */}
              {createSuccess && (
                <div className="bg-tertiary-container text-on-tertiary-container rounded-xl p-4 text-sm font-semibold text-center">
                  🥊 Beef erstellt! Warte auf Genehmigung...
                </div>
              )}

              {/* Target user search */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
                  Gegner auswählen
                </label>

                {createForm.targetUserId ? (
                  /* Selected user pill */
                  <div className="flex items-center gap-3 bg-primary-fixed-dim/10 border border-primary-fixed-dim rounded-xl p-3">
                    <span className="font-bold text-on-surface flex-1">{createForm.targetNickname}</span>
                    <button
                      onClick={() => setCreateForm(f => ({ ...f, targetUserId: '', targetNickname: '' }))}
                      className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                    >
                      <X size={16}/>
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex items-center gap-2 bg-surface-container border border-outline-variant rounded-xl px-3 py-2">
                      <Search size={16} className="text-on-surface-variant flex-shrink-0"/>
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => {
                          setUserSearch(e.target.value)
                          searchUsers(e.target.value)
                        }}
                        placeholder="Nickname suchen..."
                        className="flex-1 bg-transparent text-on-surface text-sm outline-none placeholder:text-on-surface-variant"
                      />
                      {searching && (
                        <div className="w-4 h-4 border-2 border-primary-fixed-dim border-t-transparent rounded-full animate-spin flex-shrink-0"/>
                      )}
                    </div>

                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-high border border-outline-variant rounded-xl overflow-hidden z-10 shadow-lg">
                        {searchResults.map((u) => (
                          <button
                            key={u.user_id}
                            onClick={() => {
                              setCreateForm(f => ({ ...f, targetUserId: u.user_id, targetNickname: u.nickname }))
                              setUserSearch('')
                              setSearchResults([])
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container transition-colors text-left"
                          >
                            {u.photo_url ? (
                              <img
                                src={u.photo_url.replace('http://localhost:3000', '')}
                                alt={u.nickname}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-semibold text-on-surface-variant">
                                  {(u.nickname || '?').charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="font-semibold text-on-surface text-sm">{u.nickname}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* TLDR */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
                  Worum geht's? (TLDR)
                </label>
                <input
                  type="text"
                  value={createForm.tldr}
                  onChange={(e) => setCreateForm(f => ({ ...f, tldr: e.target.value }))}
                  maxLength={120}
                  placeholder="z.B. Kevin hat den letzten Slice Pizza genommen"
                  className="bg-surface-container border border-outline-variant rounded-xl px-4 py-3
                    text-on-surface text-sm outline-none focus:border-primary-fixed-dim placeholder:text-on-surface-variant"
                />
                <span className="text-xs text-on-surface-variant text-right">{createForm.tldr.length}/120</span>
              </div>

              {/* Chat Passage */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
                  Chat-Ausschnitt als Beweis
                </label>
                <textarea
                  value={createForm.chatPassage}
                  onChange={(e) => setCreateForm(f => ({ ...f, chatPassage: e.target.value }))}
                  maxLength={1000}
                  rows={5}
                  placeholder={'[DeinNick]: Das war mein Pizza-Slice!\n[GegnerNick]: Nein, war meiner!'}
                  className="bg-surface-container border border-outline-variant rounded-xl px-4 py-3
                    text-on-surface text-sm outline-none focus:border-primary-fixed-dim resize-none
                    placeholder:text-on-surface-variant font-mono"
                />
                <span className="text-xs text-on-surface-variant text-right">{createForm.chatPassage.length}/1000</span>
              </div>

              {/* Game type selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
                  Mini-Game auswählen
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {GAME_OPTIONS.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => setCreateForm(f => ({ ...f, gameType: g.value }))}
                      className={`flex flex-col gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                        createForm.gameType === g.value
                          ? 'border-primary-fixed-dim bg-primary-fixed-dim/10'
                          : 'border-outline-variant bg-surface-container hover:border-outline'
                      }`}
                    >
                      <span className="text-xl">{g.emoji}</span>
                      <span className="font-bold text-on-surface text-xs">{g.label}</span>
                      <span className="text-[10px] text-on-surface-variant leading-snug">{g.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {createError && (
                <div className="bg-error-container text-on-error-container rounded-xl p-3 text-sm">
                  {createError}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleCreate}
                disabled={!createForm.targetUserId || !createForm.tldr.trim() || !createForm.chatPassage.trim() || creating}
                className="w-full py-4 rounded-2xl bg-primary-fixed-dim text-on-primary-container
                  font-bold text-sm disabled:opacity-40 transition-opacity"
              >
                {creating ? '...' : '🥊 Beef einreichen'}
              </button>

              <p className="text-xs text-on-surface-variant text-center">
                Dein Beef wird nach Admin-Prüfung freigegeben.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
