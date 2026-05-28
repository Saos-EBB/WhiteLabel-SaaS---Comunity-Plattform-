'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Swords, Send, Trophy } from 'lucide-react'
import { useHiddenStore } from '@/lib/store/hiddenStore'
import { useAuthStore } from '@/lib/store/authStore'
import { fetchApi } from '@/lib/api'

interface BeefDetail {
  id: string
  initiator_id: string
  target_id: string
  initiator_nickname: string | null
  target_nickname: string | null
  tldr: string
  chat_passage: string
  status: string
  winner_id: string | null
  ends_at: string | null
  initiator_coins: number
  target_coins: number
  total_votes: number
  user_vote: { side: string; coins_wagered: number } | null
}

interface Comment {
  id: string
  user_id: string
  nickname: string | null
  content: string
  created_at: string
}

const WAGER_PRESETS = [1, 5, 10, 50, 100]

function useCountdown(endsAt: string | null) {
  const [remaining, setRemaining] = useState('')
  useEffect(() => {
    if (!endsAt) return
    function update() {
      const diff = new Date(endsAt!).getTime() - Date.now()
      if (diff <= 0) { setRemaining('Vorbei'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`)
    }
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [endsAt])
  return remaining
}

export default function LiveBeefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const isHidden = useHiddenStore((s) => s.isHidden)
  const accessToken = useAuthStore((s) => s.accessToken)
  const currentUserId = (() => {
    try {
      if (!accessToken) return null
      return JSON.parse(atob(accessToken.split('.')[1])).sub as string
    } catch { return null }
  })()

  const [beef, setBeef]         = useState<BeefDetail | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading]   = useState(true)
  const [wager, setWager]       = useState(10)
  const [voting, setVoting]     = useState(false)
  const [comment, setComment]   = useState('')
  const [sending, setSending]   = useState(false)
  const [balance, setBalance]   = useState<number | null>(null)

  const countdown = useCountdown(beef?.ends_at ?? null)

  const load = useCallback(async () => {
    if (!isHidden) return
    try {
      const [b, c, bal] = await Promise.all([
        fetchApi<BeefDetail>(`/hidden/beef/${id}`),
        fetchApi<Comment[]>(`/hidden/beef/${id}/comments`),
        fetchApi<number>('/hidden/coin/balance'),
      ])
      setBeef(b)
      setComments(Array.isArray(c) ? c : [])
      setBalance(typeof bal === 'number' ? bal : 0)
    } catch { router.replace('/beef') }
    finally { setLoading(false) }
  }, [isHidden, id, router])

  useEffect(() => {
    if (!isHidden) { router.replace('/dashboard'); return }
    load()
  }, [isHidden, load, router])

  // Poll comments every 10s when active
  useEffect(() => {
    if (!beef || beef.status !== 'active') return
    const iv = setInterval(async () => {
      try {
        const c = await fetchApi<Comment[]>(`/hidden/beef/${id}/comments`)
        setComments(Array.isArray(c) ? c : [])
      } catch {}
    }, 10000)
    return () => clearInterval(iv)
  }, [beef, id])

  async function handleVote(side: 'initiator' | 'target') {
    if (!beef || voting) return
    setVoting(true)
    try {
      await fetchApi(`/hidden/beef/${id}/vote`, {
        method: 'POST',
        body: JSON.stringify({ side, coins_wagered: wager }),
      })
      await load()
    } catch (e: any) {
      alert(e?.message ?? 'Fehler beim Voten')
    } finally { setVoting(false) }
  }

  async function handleComment() {
    if (!comment.trim() || sending) return
    setSending(true)
    try {
      await fetchApi(`/hidden/beef/${id}/comment`, {
        method: 'POST',
        body: JSON.stringify({ content: comment.trim() }),
      })
      setComment('')
      const c = await fetchApi<Comment[]>(`/hidden/beef/${id}/comments`)
      setComments(Array.isArray(c) ? c : [])
    } catch {} finally { setSending(false) }
  }

  if (!isHidden) return null
  if (loading) return (
    <div className="flex justify-center py-32">
      <div className="w-6 h-6 border-2 border-primary-fixed-dim border-t-transparent rounded-full animate-spin"/>
    </div>
  )
  if (!beef) return null

  const isParticipant = beef.initiator_id === currentUserId || beef.target_id === currentUserId
  const hasVoted      = !!beef.user_vote
  const isActive      = beef.status === 'active'
  const isClosed      = beef.status === 'closed'
  const totalCoins    = beef.initiator_coins + beef.target_coins
  const initPct       = totalCoins > 0 ? Math.round(beef.initiator_coins / totalCoins * 100) : 50

  return (
    <div className="max-w-screen-sm mx-auto px-4 py-6 pb-32">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/beef"
          className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
          <ArrowLeft size={20}/>
        </Link>
        <span className="font-bold text-on-surface flex-1">{beef.tldr}</span>
        {isActive && countdown && (
          <span className="text-xs text-on-surface-variant bg-surface-container-high
            px-2 py-1 rounded-full font-mono">
            🕐 {countdown}
          </span>
        )}
        {isClosed && (
          <span className="text-xs font-bold text-primary-fixed-dim bg-primary-fixed-dim/20
            px-2 py-1 rounded-full">
            CLOSED
          </span>
        )}
      </div>

      {/* Participants */}
      <div className="flex items-center justify-between bg-surface-container
        border border-outline-variant rounded-2xl p-5 mb-4">
        <div className="flex flex-col items-center gap-1 flex-1">
          <span className={`font-bold text-sm ${
            isClosed && beef.winner_id === beef.initiator_id
              ? 'text-primary-fixed-dim' : 'text-on-surface'
          }`}>
            {beef.initiator_nickname ?? '???'}
          </span>
          <span className="text-xs text-on-surface-variant">Initiator</span>
          {isClosed && beef.winner_id === beef.initiator_id && (
            <Trophy size={14} className="text-primary-fixed-dim"/>
          )}
        </div>
        <Swords size={24} className="text-primary-fixed-dim flex-shrink-0"/>
        <div className="flex flex-col items-center gap-1 flex-1">
          <span className={`font-bold text-sm ${
            isClosed && beef.winner_id === beef.target_id
              ? 'text-primary-fixed-dim' : 'text-on-surface'
          }`}>
            {beef.target_nickname ?? '???'}
          </span>
          <span className="text-xs text-on-surface-variant">Target</span>
          {isClosed && beef.winner_id === beef.target_id && (
            <Trophy size={14} className="text-primary-fixed-dim"/>
          )}
        </div>
      </div>

      {/* Passage */}
      <div className="bg-surface-container-low border-l-2 border-primary-fixed-dim
        rounded-r-xl p-4 mb-4">
        <p className="text-xs text-on-surface-variant mb-1">Chat Passage</p>
        <p className="text-sm text-on-surface-variant italic leading-relaxed whitespace-pre-line">
          {beef.chat_passage}
        </p>
      </div>

      {/* Vote distribution bar */}
      {totalCoins > 0 && (
        <div className="bg-surface-container border border-outline-variant
          rounded-2xl p-4 mb-4">
          <div className="flex justify-between text-xs text-on-surface-variant mb-2">
            <span>{beef.initiator_coins} Coins</span>
            <span className="text-on-surface">{totalCoins} total</span>
            <span>{beef.target_coins} Coins</span>
          </div>
          <div className="h-3 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-fixed-dim rounded-full transition-all duration-500"
              style={{ width: `${initPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-on-surface-variant mt-1">
            <span>{initPct}%</span>
            <span>{beef.total_votes} Votes</span>
            <span>{100 - initPct}%</span>
          </div>
        </div>
      )}

      {/* Double KO result */}
      {isClosed && beef.winner_id === null && (
        <div className="bg-surface-container border border-outline-variant
          rounded-2xl p-4 mb-4 text-center">
          <p className="font-bold text-on-surface text-lg">💥 DOUBLE KO</p>
          <p className="text-sm text-on-surface-variant">Unentschieden — alles ans Haus</p>
        </div>
      )}

      {/* Voting section */}
      {isActive && !isParticipant && !hasVoted && (
        <div className="bg-surface-container border border-outline-variant
          rounded-2xl p-4 mb-4">
          <p className="text-sm font-semibold text-on-surface mb-3">
            🗳️ Voten — {balance !== null ? `${balance} Coins verfügbar` : ''}
          </p>

          {/* Wager presets */}
          <div className="flex flex-wrap gap-2 mb-4">
            {WAGER_PRESETS.map(w => (
              <button key={w} onClick={() => setWager(w)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  wager === w
                    ? 'border-primary-fixed-dim bg-primary-fixed-dim/20 text-on-surface'
                    : 'border-outline-variant text-on-surface-variant hover:border-outline'
                }`}>
                {w} 🪙
              </button>
            ))}
          </div>

          {/* Vote buttons */}
          <div className="flex gap-3">
            <button onClick={() => handleVote('initiator')}
              disabled={voting || (balance ?? 0) < wager}
              className="flex-1 py-3 rounded-xl bg-surface-container-high border
                border-outline-variant text-on-surface font-bold text-sm
                disabled:opacity-40 transition-opacity hover:border-primary-fixed-dim">
              ← {beef.initiator_nickname ?? 'Initiator'}
            </button>
            <button onClick={() => handleVote('target')}
              disabled={voting || (balance ?? 0) < wager}
              className="flex-1 py-3 rounded-xl bg-surface-container-high border
                border-outline-variant text-on-surface font-bold text-sm
                disabled:opacity-40 transition-opacity hover:border-primary-fixed-dim">
              {beef.target_nickname ?? 'Target'} →
            </button>
          </div>
        </div>
      )}

      {/* Already voted */}
      {isActive && hasVoted && beef.user_vote && (
        <div className="bg-primary-fixed-dim/10 border border-primary-fixed-dim
          rounded-2xl p-4 mb-4 text-center">
          <p className="text-sm text-on-surface">
            Du hast {beef.user_vote.coins_wagered} 🪙 auf{' '}
            <span className="font-bold">
              {beef.user_vote.side === 'initiator'
                ? beef.initiator_nickname ?? 'Initiator'
                : beef.target_nickname ?? 'Target'}
            </span> gesetzt
          </p>
        </div>
      )}

      {/* Comments */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-on-surface">
          Kommentare ({comments.length})
        </p>

        {comments.length === 0 ? (
          <p className="text-xs text-on-surface-variant text-center py-4">
            Noch keine Kommentare
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {comments.map(c => (
              <div key={c.id}
                className="bg-surface-container rounded-xl px-4 py-3">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-semibold text-primary-fixed-dim">
                    {c.nickname ?? c.user_id.slice(0, 8)}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    {new Date(c.created_at).toLocaleTimeString('de-AT',
                      { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant leading-snug">
                  {c.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Comment input */}
        {isActive && (
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              maxLength={500}
              placeholder="Kommentar..."
              className="flex-1 bg-surface-container-low border border-outline-variant
                rounded-lg px-4 py-2.5 text-on-surface text-sm outline-none
                focus:border-primary-fixed-dim"
            />
            <button onClick={handleComment} disabled={!comment.trim() || sending}
              className="p-2.5 rounded-lg bg-primary-fixed-dim text-on-primary-container
                disabled:opacity-40 transition-opacity">
              <Send size={18}/>
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
