'use client'

import { useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { fetchApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'

// ─── Types ───────────────────────────────────────────────────────────────────

type RpsChoice = 'rock' | 'paper' | 'scissors' | 'lizard' | 'spock'

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
  const { t } = useTranslation()
  const CHOICES: { value: RpsChoice; emoji: string; label: string }[] = [
    { value: 'rock',     emoji: '✊', label: t.beef.rpsRock },
    { value: 'paper',    emoji: '✋', label: t.beef.rpsPaper },
    { value: 'scissors', emoji: '✌️',  label: t.beef.rpsScissors },
    { value: 'lizard',   emoji: '🦎', label: t.beef.rpsLizard },
    { value: 'spock',    emoji: '🖖', label: t.beef.rpsSpock },
  ]
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
    fetchApi<{ game_type: string; round: number; both_submitted: boolean; initiator_choice: RpsChoice | null; target_choice: RpsChoice | null; round_winner: string | null }>(`/hidden/beef/${beefId}/game`)
      .then((gs) => {
        if (gs.game_type !== 'rps') return
        setRound(gs.round ?? 1)
        if (gs.both_submitted) {
          setRevealed({
            initiatorChoice: gs.initiator_choice,
            targetChoice: gs.target_choice,
            roundWinner: gs.round_winner,
          })
        }
      })
      .catch(() => { /* WS will update */ })
  }, [beefId])

  // ── Socket: board update ─────────────────────────────────────────────────
  useEffect(() => {
    function onBoardUpdate(data: {
      game_type: string
      round: number
      both_submitted: boolean
      initiator_choice: RpsChoice | null
      target_choice: RpsChoice | null
      round_winner: string | null
    }) {
      if (data.game_type !== 'rps') return
      setRound(data.round)
      if (data.both_submitted) {
        setRevealed({
          initiatorChoice: data.initiator_choice,
          targetChoice: data.target_choice,
          roundWinner: data.round_winner,
        })
        setOpponentChose(false)
      } else {
        setOpponentChose(true)
      }
    }

    socket.on('game:board_update', onBoardUpdate)
    return () => { socket.off('game:board_update', onBoardUpdate) }
  }, [socket])

  // ── Submit choice ────────────────────────────────────────────────────────
  async function handleChoice(choice: RpsChoice) {
    if (!isParticipant || myChoice || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await fetchApi(`/hidden/beef/${beefId}/game/move`, {
        method: 'POST',
        body: JSON.stringify({ move: { choice } }),
      })
      setMyChoice(choice)
      setOpponentChose(false) // reset; board_update will re-set if opponent already chose
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.common.error)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function choiceEmoji(c: RpsChoice | null) {
    return CHOICES.find((x) => x.value === c)?.emoji ?? '❓'
  }

  function roundWinnerName(id: string | null) {
    if (!id) return ''
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
          {t.beef.roundLabel.replace('{n}', String(round))}
        </span>
        {!isParticipant && (
          <p className="text-xs text-on-surface-variant mt-1">{t.beef.spectatorHint}</p>
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
              ? t.beef.rpsDrawNewRound
              : revealed.roundWinner === currentUserId
                ? t.beef.rpsYouWinRound
                : t.beef.rpsWinsRound.replace('{name}', roundWinnerName(revealed.roundWinner))}
          </div>
        </div>
      ) : (
        /* Choice buttons */
        <div className="flex flex-col gap-4">
          {isParticipant && !myChoice && (
            <p className="text-center text-sm text-on-surface">{t.beef.rpsChoose}</p>
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
              {t.beef.rpsWaiting.replace('{emoji}', choiceEmoji(myChoice))}
            </p>
          )}
          {myChoice && opponentChose && (
            <p className="text-center text-xs text-on-surface-variant animate-pulse">
              {t.beef.rpsBothChosen}
            </p>
          )}
          {!myChoice && opponentChose && isParticipant && (
            <p className="text-center text-xs text-primary-fixed-dim font-semibold animate-pulse">
              {t.beef.rpsOpponentChose}
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
