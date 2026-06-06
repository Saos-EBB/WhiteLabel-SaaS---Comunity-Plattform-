'use client'

import { useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { fetchApi } from '@/lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────

type RpsChoice = 'rock' | 'paper' | 'scissors'

interface RpsRoundResult {
  initiator_choice: RpsChoice | null
  target_choice: RpsChoice | null
  round_winner: string | null // userId or null for draw
  round: number
}

interface RpsGameState {
  round: number
  initiator_choice: RpsChoice | null
  target_choice: RpsChoice | null
  /** Null until both submitted */
  round_result: RpsRoundResult | null
  my_choice: RpsChoice | null
}

export interface RpsGameProps {
  beefId: string
  socket: Socket
  currentUserId: string | null
  initiatorId: string
  targetId: string
  initiatorNickname: string
  targetNickname: string
  isParticipant: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CHOICES: { value: RpsChoice; emoji: string; label: string }[] = [
  { value: 'rock',     emoji: '✊', label: 'Stein' },
  { value: 'paper',    emoji: '✋', label: 'Papier' },
  { value: 'scissors', emoji: '✌️',  label: 'Schere' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function RpsGame({
  beefId,
  socket,
  currentUserId,
  initiatorId,
  targetId,
  initiatorNickname,
  targetNickname,
  isParticipant,
}: RpsGameProps) {
  const [myChoice, setMyChoice] = useState<RpsChoice | null>(null)
  const [opponentChose, setOpponentChose] = useState(false)
  const [revealed, setRevealed] = useState<{
    initiatorChoice: RpsChoice | null
    targetChoice: RpsChoice | null
    roundWinner: string | null
  } | null>(null)
  const [round, setRound] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isInitiator = currentUserId === initiatorId
  const isTarget = currentUserId === targetId

  // ── Load current game state ──────────────────────────────────────────────
  useEffect(() => {
    fetchApi<RpsGameState>(`/hidden/beef/${beefId}/game`)
      .then((gs) => {
        setRound(gs.round ?? 1)
        if (gs.my_choice) setMyChoice(gs.my_choice)
        // If both have chosen, show revealed state
        if (gs.round_result) {
          setRevealed({
            initiatorChoice: gs.round_result.initiator_choice,
            targetChoice: gs.round_result.target_choice,
            roundWinner: gs.round_result.round_winner,
          })
        }
      })
      .catch(() => { /* WS will update */ })
  }, [beefId])

  // ── Socket: round result (both submitted) ────────────────────────────────
  useEffect(() => {
    function onMove(data: {
      round: number
      initiator_choice: RpsChoice | null
      target_choice: RpsChoice | null
      round_winner: string | null
      both_submitted: boolean
    }) {
      if (data.both_submitted) {
        setRevealed({
          initiatorChoice: data.initiator_choice,
          targetChoice: data.target_choice,
          roundWinner: data.round_winner,
        })
        setOpponentChose(false)
      } else {
        // One side submitted — flag opponent chose if it's not us
        const submitterId = data.initiator_choice && !data.target_choice
          ? initiatorId
          : targetId
        if (submitterId !== currentUserId) setOpponentChose(true)
      }
    }

    function onNewRound(data: { round: number }) {
      setRound(data.round)
      setMyChoice(null)
      setRevealed(null)
      setOpponentChose(false)
    }

    socket.on('game:rps_move', onMove)
    socket.on('game:rps_new_round', onNewRound)

    return () => {
      socket.off('game:rps_move', onMove)
      socket.off('game:rps_new_round', onNewRound)
    }
  }, [socket, currentUserId, initiatorId, targetId])

  // ── Submit choice ────────────────────────────────────────────────────────
  async function handleChoice(choice: RpsChoice) {
    if (!isParticipant || myChoice || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await fetchApi(`/hidden/beef/${beefId}/game/move`, {
        method: 'POST',
        body: JSON.stringify({ choice }),
      })
      setMyChoice(choice)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function choiceEmoji(c: RpsChoice | null) {
    return CHOICES.find((x) => x.value === c)?.emoji ?? '❓'
  }

  function roundWinnerName(id: string | null) {
    if (!id) return 'Unentschieden'
    if (id === initiatorId) return initiatorNickname
    if (id === targetId) return targetNickname
    return id
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 max-w-sm mx-auto w-full">

      {/* Round indicator */}
      <div className="text-center">
        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
          Runde {round}
        </span>
        {!isParticipant && (
          <p className="text-xs text-on-surface-variant mt-1">Zuschauer — read only</p>
        )}
      </div>

      {/* Revealed result */}
      {revealed ? (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <span className="text-5xl">{choiceEmoji(revealed.initiatorChoice)}</span>
              <span className="text-xs text-on-surface-variant">{initiatorNickname}</span>
            </div>
            <span className="text-2xl font-bold text-on-surface-variant">VS</span>
            <div className="flex flex-col items-center gap-1">
              <span className="text-5xl">{choiceEmoji(revealed.targetChoice)}</span>
              <span className="text-xs text-on-surface-variant">{targetNickname}</span>
            </div>
          </div>

          <div className={`px-4 py-2 rounded-full text-sm font-bold ${
            revealed.roundWinner === null
              ? 'bg-surface-container-high text-on-surface'
              : revealed.roundWinner === currentUserId
                ? 'bg-primary-fixed-dim/20 text-primary-fixed-dim'
                : 'bg-error-container text-on-error-container'
          }`}>
            {revealed.roundWinner === null
              ? '🤝 Unentschieden — neue Runde!'
              : revealed.roundWinner === currentUserId
                ? '🏆 Du gewinnst diese Runde!'
                : `${roundWinnerName(revealed.roundWinner)} gewinnt diese Runde`}
          </div>
        </div>
      ) : (
        /* Choice buttons */
        <div className="flex flex-col gap-4">
          {isParticipant && !myChoice && (
            <p className="text-center text-sm text-on-surface">Wähle deine Waffe:</p>
          )}

          <div className="flex gap-3 justify-center">
            {CHOICES.map((c) => {
              const isSelected = myChoice === c.value
              return (
                <button
                  key={c.value}
                  onClick={() => handleChoice(c.value)}
                  disabled={!isParticipant || !!myChoice || submitting}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    isSelected
                      ? 'border-primary-fixed-dim bg-primary-fixed-dim/10'
                      : myChoice
                        ? 'border-outline-variant bg-surface-container opacity-40'
                        : 'border-outline-variant bg-surface-container hover:border-primary-fixed-dim active:scale-95'
                  } disabled:cursor-not-allowed`}
                >
                  <span className="text-4xl">{c.emoji}</span>
                  <span className="text-xs font-semibold text-on-surface">{c.label}</span>
                </button>
              )
            })}
          </div>

          {/* Status messages */}
          {myChoice && !opponentChose && (
            <p className="text-center text-xs text-on-surface-variant">
              Deine Wahl: {choiceEmoji(myChoice)} — warte auf Gegner...
            </p>
          )}
          {myChoice && opponentChose && (
            <p className="text-center text-xs text-on-surface-variant animate-pulse">
              Beide haben gewählt — Ergebnis wird enthüllt...
            </p>
          )}
          {!myChoice && opponentChose && isParticipant && (
            <p className="text-center text-xs text-primary-fixed-dim font-semibold animate-pulse">
              Dein Gegner hat gewählt — du bist dran!
            </p>
          )}

          {error && (
            <p className="text-center text-xs text-error">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}
