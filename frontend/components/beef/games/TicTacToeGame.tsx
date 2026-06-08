'use client'

import { useEffect, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { fetchApi } from '@/lib/api'

const TURN_MS = 15_000

// ─── Types ───────────────────────────────────────────────────────────────────

type Cell = 'X' | 'O' | null
type BoardIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

interface TttGameState {
  board: Cell[]
  current_turn: string // userId
  initiator_wins: number
  target_wins: number
  game_number: number // which game in best-of-3
  game_winner: string | null
  is_draw: boolean
}

export interface TicTacToeGameProps {
  beefId: string
  socket: Socket
  currentUserId: string | null
  initiatorId: string
  targetId: string
  initiatorNickname: string
  targetNickname: string
  isParticipant: boolean
}

// ─── Win patterns ────────────────────────────────────────────────────────────

const WIN_LINES: [number, number, number][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diags
]

function getWinLine(board: Cell[]): [number, number, number] | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line
  }
  return null
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TicTacToeGame({
  beefId,
  socket,
  currentUserId,
  initiatorId,
  targetId,
  initiatorNickname,
  targetNickname,
  isParticipant,
}: TicTacToeGameProps) {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null))
  const [currentTurn, setCurrentTurn] = useState<string>(initiatorId)
  const [initiatorWins, setInitiatorWins] = useState(0)
  const [targetWins, setTargetWins] = useState(0)
  const [gameNumber, setGameNumber] = useState(1)
  const [gameWinner, setGameWinner] = useState<string | null>(null)
  const [isDraw, setIsDraw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_MS)
  const turnStartRef = useRef<number>(0)

  // Initiator = X, Target = O
  const myMark: Cell = currentUserId === initiatorId ? 'X' : currentUserId === targetId ? 'O' : null
  const isMyTurn = currentUserId === currentTurn

  // ── Fetch initial state ──────────────────────────────────────────────────
  useEffect(() => {
    fetchApi<TttGameState & { game_type: string }>(`/hidden/beef/${beefId}/game`)
      .then((gs) => {
        if (gs.game_type !== 'tictactoe') return
        if (gs.board) setBoard(gs.board)
        if (gs.current_turn) setCurrentTurn(gs.current_turn)
        setInitiatorWins(gs.initiator_wins ?? 0)
        setTargetWins(gs.target_wins ?? 0)
        setGameNumber(gs.game_number ?? 1)
        setGameWinner(gs.game_winner ?? null)
        setIsDraw(gs.is_draw ?? false)
      })
      .catch(() => { /* WS will update */ })
  }, [beefId])

  // ── Socket listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    function onBoardUpdate(data: TttGameState & { game_type: string }) {
      if (data.game_type !== 'tictactoe') return
      turnStartRef.current = Date.now()
      setTurnTimeLeft(TURN_MS)
      setBoard(data.board)
      setCurrentTurn(data.current_turn)
      setGameWinner(data.game_winner)
      setIsDraw(data.is_draw)
      setInitiatorWins(data.initiator_wins)
      setTargetWins(data.target_wins)
      setGameNumber(data.game_number)
    }

    socket.on('game:board_update', onBoardUpdate)
    return () => { socket.off('game:board_update', onBoardUpdate) }
  }, [socket])

  // ── Turn timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    turnStartRef.current = Date.now()
    if (gameWinner || isDraw) return
    const iv = setInterval(() => setTurnTimeLeft(
      Math.max(0, TURN_MS - (Date.now() - turnStartRef.current))
    ), 50)
    return () => clearInterval(iv)
  }, [currentTurn, gameWinner, isDraw])

  // ── Place move ───────────────────────────────────────────────────────────
  async function handleCell(index: number) {
    if (!isMyTurn || !isParticipant || board[index] || submitting || gameWinner || isDraw) return
    setSubmitting(true)
    try {
      await fetchApi(`/hidden/beef/${beefId}/game/move`, {
        method: 'POST',
        body: JSON.stringify({ move: { position: index } }),
      })
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const winLine = getWinLine(board)

  function winnerName(id: string | null) {
    if (!id) return ''
    return id === initiatorId ? initiatorNickname : targetNickname
  }

  function turnName() {
    return currentTurn === initiatorId ? initiatorNickname : targetNickname
  }

  const timerSec = Math.floor(turnTimeLeft / 1000)
  const timerMs  = Math.floor((turnTimeLeft % 1000) / 10)
  const timerUrgent = turnTimeLeft < 5000 && !gameWinner && !isDraw

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 max-w-xs mx-auto w-full">

      {/* Score tracker */}
      <div className="flex items-center justify-between bg-surface-container border border-outline-variant rounded-2xl p-3">
        <div className="flex flex-col items-center flex-1">
          <span className="text-xs text-on-surface-variant">{initiatorNickname}</span>
          <span className="text-2xl font-bold text-primary-fixed-dim">{initiatorWins}</span>
          <span className="text-[10px] text-on-surface-variant font-mono">X</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-on-surface-variant">Spiel {gameNumber}/3</span>
          <span className="text-sm font-bold text-on-surface">Best of 3</span>
        </div>
        <div className="flex flex-col items-center flex-1">
          <span className="text-xs text-on-surface-variant">{targetNickname}</span>
          <span className="text-2xl font-bold text-primary-fixed-dim">{targetWins}</span>
          <span className="text-[10px] text-on-surface-variant font-mono">O</span>
        </div>
      </div>

      {/* Turn / result banner — ABOVE board */}
      {gameWinner ? (
        <div className="text-center bg-primary-fixed-dim/10 border border-primary-fixed-dim rounded-xl p-3">
          <p className="font-bold text-primary-fixed-dim">
            🏆 {winnerName(gameWinner)} gewinnt dieses Spiel!
          </p>
          {(initiatorWins < 2 && targetWins < 2) && (
            <p className="text-xs text-on-surface-variant mt-1">Nächstes Spiel startet...</p>
          )}
        </div>
      ) : isDraw ? (
        <div className="text-center bg-surface-container-high border border-outline-variant rounded-xl p-3">
          <p className="font-bold text-on-surface">🤝 Unentschieden — Extra-Spiel!</p>
        </div>
      ) : (
        <div className={`text-center py-3 px-4 rounded-xl border-2 transition-colors ${
          isMyTurn && isParticipant
            ? 'border-primary-fixed-dim bg-primary-fixed-dim/10'
            : 'border-outline-variant bg-surface-container'
        }`}>
          <p className={`font-bold text-sm ${
            isMyTurn && isParticipant ? 'text-primary-fixed-dim' : 'text-on-surface-variant'
          }`}>
            {isParticipant
              ? isMyTurn
                ? `Du bist dran (${myMark})`
                : `${turnName()} ist dran`
              : `${turnName()} ist dran`}
          </p>
        </div>
      )}

      {/* Board */}
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => {
          const isWinCell = winLine?.includes(i as BoardIndex) ?? false
          const canClick = isMyTurn && isParticipant && !cell && !gameWinner && !isDraw && !submitting

          return (
            <button
              key={i}
              onClick={() => handleCell(i)}
              disabled={!canClick}
              className={`aspect-square rounded-2xl border-2 flex items-center justify-center text-4xl font-bold transition-all ${
                isWinCell
                  ? 'border-primary-fixed-dim bg-primary-fixed-dim/20'
                  : cell
                    ? 'border-outline-variant bg-surface-container'
                    : canClick
                      ? 'border-outline-variant bg-surface-container hover:border-primary-fixed-dim hover:bg-primary-fixed-dim/5 active:scale-95'
                      : 'border-outline-variant bg-surface-container-low opacity-70'
              } disabled:cursor-not-allowed`}
            >
              {cell === 'X' && <span className="text-rose-500">X</span>}
              {cell === 'O' && <span className="text-sky-500">O</span>}
            </button>
          )
        })}
      </div>

      {/* Turn timer — BELOW board */}
      {!gameWinner && !isDraw && (
        <div className="flex flex-col items-center gap-2 pt-1">
          <span className={`text-3xl font-mono font-bold tabular-nums transition-colors ${
            timerUrgent ? 'text-rose-500' : 'text-on-surface'
          }`}>
            {timerSec}.{String(timerMs).padStart(2, '0')}
          </span>
          <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
            <div
              className={`h-full rounded-full transition-none ${timerUrgent ? 'bg-rose-500' : 'bg-primary-fixed-dim'}`}
              style={{ width: `${(turnTimeLeft / TURN_MS) * 100}%` }}
            />
          </div>
          <span className="text-xs text-on-surface-variant">
            {isMyTurn && isParticipant ? 'Sekunden zum Ziehen' : 'Verbleibende Zeit'}
          </span>
        </div>
      )}

      {!isParticipant && (
        <p className="text-center text-xs text-on-surface-variant">Zuschauer — read only</p>
      )}
    </div>
  )
}
