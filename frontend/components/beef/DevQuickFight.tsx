'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchApi } from '@/lib/api'

const GAME_TYPES = [
  { value: 'tictactoe', label: 'TicTacToe' },
  { value: 'rps', label: 'RPS' },
  { value: 'mastermind', label: 'Mastermind' },
  { value: 'reaction', label: 'Reaction' },
]

export function DevQuickFight() {
  if (process.env.NODE_ENV === 'production') return null

  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [targetUserId, setTargetUserId] = useState('')
  const [gameType, setGameType] = useState('tictactoe')
  const [loading, setLoading] = useState(false)

  async function start() {
    if (!targetUserId.trim()) return
    setLoading(true)
    try {
      const res = await fetchApi<{ beefId: string }>('/hidden/beef/dev/quick-fight', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: targetUserId.trim(), gameType }),
      })
      router.push(`/beef/${res.beefId}`)
      setOpen(false)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="bg-surface-container border border-yellow-400/40 rounded-2xl p-4 flex flex-col gap-3 w-72 shadow-xl">
          <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider">DEV — Quick Fight</p>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-on-surface-variant">Target User ID</label>
            <input
              value={targetUserId}
              onChange={e => setTargetUserId(e.target.value)}
              placeholder="uuid..."
              className="bg-surface-container-high border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-yellow-400 font-mono"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-on-surface-variant">Game Type</label>
            <select
              value={gameType}
              onChange={e => setGameType(e.target.value)}
              className="bg-surface-container-high border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-yellow-400"
            >
              {GAME_TYPES.map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={start}
            disabled={loading || !targetUserId.trim()}
            className="bg-yellow-400 text-black font-bold text-sm rounded-xl py-2 disabled:opacity-40 active:scale-95 transition-transform"
          >
            {loading ? '...' : '⚡ Quick Fight'}
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="bg-yellow-400 text-black text-xs font-bold px-3 py-2 rounded-full shadow-lg active:scale-95 transition-transform"
      >
        {open ? '✕ DEV' : '⚡ DEV'}
      </button>
    </div>
  )
}
