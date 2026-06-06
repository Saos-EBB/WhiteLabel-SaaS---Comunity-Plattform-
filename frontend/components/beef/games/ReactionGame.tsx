'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import type { Socket } from 'socket.io-client'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReactionResult {
  user_id: string
  reaction_ms: number
}

export interface ReactionGameProps {
  beefId: string
  socket: Socket
  currentUserId: string | null
  initiatorId: string
  targetId: string
  initiatorNickname: string
  targetNickname: string
  isParticipant: boolean
}

// ─── Timer formatter ─────────────────────────────────────────────────────────

function formatMs(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const millis  = Math.floor(ms % 1000)
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ReactionGame({
  beefId,
  socket,
  currentUserId,
  initiatorId,
  targetId,
  initiatorNickname,
  targetNickname,
  isParticipant,
}: ReactionGameProps) {
  // 'wait' = red, waiting for GO signal
  // 'go'   = green, click NOW!
  // 'done' = clicked, show my time
  type Phase = 'wait' | 'go' | 'done'

  const [phase, setPhase] = useState<Phase>('wait')
  const [myTime, setMyTime] = useState<number | null>(null)
  const [opponentTime, setOpponentTime] = useState<number | null>(null)
  const [displayMs, setDisplayMs] = useState(0) // live counter when in 'go'
  const goAt = useRef<number>(0)
  const rafRef = useRef<number>(0)

  const iAmParticipant = isParticipant && currentUserId !== null

  // ── Live ms counter while waiting for click ──────────────────────────────
  const startCounter = useCallback(() => {
    goAt.current = performance.now()
    function tick() {
      setDisplayMs(Math.floor(performance.now() - goAt.current))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  function stopCounter() {
    cancelAnimationFrame(rafRef.current)
  }

  // ── Socket: GO! signal ───────────────────────────────────────────────────
  useEffect(() => {
    function onGo(_data: { sent_at: string }) {
      setPhase('go')
      if (iAmParticipant) startCounter()
    }

    function onResult(data: ReactionResult) {
      // Collect results
      if (data.user_id === currentUserId) {
        setMyTime(data.reaction_ms)
        setPhase('done')
        stopCounter()
      } else {
        setOpponentTime(data.reaction_ms)
      }
    }

    socket.on('game:go', onGo)
    socket.on('game:reaction_result', onResult)

    return () => {
      socket.off('game:go', onGo)
      socket.off('game:reaction_result', onResult)
      stopCounter()
    }
  }, [socket, iAmParticipant, currentUserId, startCounter])

  // ── Handle click ─────────────────────────────────────────────────────────
  function handleClick() {
    if (!iAmParticipant || phase !== 'go') return
    const elapsed = Math.floor(performance.now() - goAt.current)
    stopCounter()
    setMyTime(elapsed)
    setPhase('done')
    // Emit click event to server
    socket.emit('game:reaction_click')
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const otherNickname = currentUserId === initiatorId ? targetNickname : initiatorNickname

  return (
    <div className="flex flex-col gap-6 max-w-sm mx-auto w-full">

      {/* Instructions */}
      <div className="text-center">
        <p className="text-xs text-on-surface-variant uppercase tracking-widest font-semibold">
          Reaktionstest
        </p>
        <p className="text-xs text-on-surface-variant mt-1">
          {phase === 'wait' ? 'Warte auf das GO-Signal...' :
           phase === 'go'   ? 'JETZT DRÜCKEN!' :
                              'Ergebnis wird berechnet...'}
        </p>
      </div>

      {/* Big button */}
      {iAmParticipant ? (
        <button
          onClick={handleClick}
          disabled={phase !== 'go'}
          className={`w-full py-16 rounded-3xl font-bold text-2xl tracking-widest transition-all select-none ${
            phase === 'wait'
              ? 'bg-error/80 text-white cursor-not-allowed'
              : phase === 'go'
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 animate-pulse active:scale-95 cursor-pointer'
                : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
          }`}
        >
          {phase === 'wait' ? '🔴  WAIT' :
           phase === 'go'   ? '🟢  GO!' :
                              '✓ Registriert'}
        </button>
      ) : (
        /* Spectator view */
        <div className={`w-full py-16 rounded-3xl font-bold text-2xl tracking-widest text-center select-none ${
          phase === 'wait' ? 'bg-error/80 text-white' :
          phase === 'go'   ? 'bg-green-500 text-white animate-pulse' :
                             'bg-surface-container-high text-on-surface-variant'
        }`}>
          {phase === 'wait' ? '🔴  WAIT' : phase === 'go' ? '🟢  GO!' : '✓ Fertig'}
        </div>
      )}

      {/* Live timer (only when in GO phase and participant) */}
      {phase === 'go' && iAmParticipant && (
        <div className="text-center">
          <span className="text-3xl font-mono font-bold text-on-surface tabular-nums">
            {formatMs(displayMs)}
          </span>
        </div>
      )}

      {/* Results */}
      <div className="flex flex-col gap-3">
        {myTime !== null && (
          <div className="flex items-center justify-between bg-primary-fixed-dim/10 border border-primary-fixed-dim rounded-2xl p-4">
            <span className="text-sm font-semibold text-on-surface">
              {iAmParticipant ? 'Deine Zeit' : currentUserId === initiatorId ? initiatorNickname : targetNickname}
            </span>
            <span className="font-mono font-bold text-primary-fixed-dim text-lg tabular-nums">
              {formatMs(myTime)}
            </span>
          </div>
        )}

        {opponentTime !== null && (
          <div className="flex items-center justify-between bg-surface-container border border-outline-variant rounded-2xl p-4">
            <span className="text-sm font-semibold text-on-surface">
              {otherNickname}
            </span>
            <span className="font-mono font-bold text-on-surface text-lg tabular-nums">
              {formatMs(opponentTime)}
            </span>
          </div>
        )}

        {myTime === null && opponentTime === null && phase === 'done' && (
          <p className="text-center text-xs text-on-surface-variant">
            Warte auf Ergebnisse...
          </p>
        )}
      </div>

      {!iAmParticipant && (
        <p className="text-center text-xs text-on-surface-variant">Zuschauer — read only</p>
      )}
    </div>
  )
}
