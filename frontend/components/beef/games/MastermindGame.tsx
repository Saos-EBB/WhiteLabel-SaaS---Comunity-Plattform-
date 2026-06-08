'use client'

import { useEffect, useState, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import { fetchApi } from '@/lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────

export type MmColor = 'R' | 'G' | 'B' | 'Y' | 'P' | 'O'

interface MmGuessRow {
  guess: MmColor[]
  exact: number   // correct color + position
  partial: number // correct color, wrong position
}

interface MmPlayerState {
  guesses: MmGuessRow[]
  solved: boolean
  attempts: number
  redacted?: boolean
}

interface MmGameState {
  initiator: MmPlayerState
  target: MmPlayerState
}

export interface MastermindGameProps {
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

const COLORS: { value: MmColor; bg: string; border: string }[] = [
  { value: 'R', bg: 'bg-red-500',    border: 'border-red-600' },
  { value: 'G', bg: 'bg-green-500',  border: 'border-green-600' },
  { value: 'B', bg: 'bg-blue-500',   border: 'border-blue-600' },
  { value: 'Y', bg: 'bg-yellow-400', border: 'border-yellow-500' },
  { value: 'P', bg: 'bg-purple-500', border: 'border-purple-600' },
  { value: 'O', bg: 'bg-orange-500', border: 'border-orange-600' },
]

const MAX_GUESSES = 8
const CODE_LENGTH = 4

function colorClass(c: MmColor | null, variant: 'bg' | 'border' = 'bg'): string {
  if (!c) return variant === 'bg' ? 'bg-surface-container-high' : 'border-outline-variant'
  const found = COLORS.find((x) => x.value === c)
  if (!found) return ''
  return variant === 'bg' ? found.bg : found.border
}

// ─── Slot / Drag-Drop Helpers ────────────────────────────────────────────────

function ColorPalette({
  onPick,
  disabled,
}: {
  onPick: (c: MmColor) => void
  disabled: boolean
}) {
  return (
    <div className="flex gap-2 justify-center flex-wrap">
      {COLORS.map((c) => (
        <button
          key={c.value}
          onClick={() => !disabled && onPick(c.value)}
          disabled={disabled}
          className={`w-9 h-9 rounded-full ${c.bg} ${c.border} border-2
            shadow-sm transition-transform ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}`}
          aria-label={c.value}
        />
      ))}
    </div>
  )
}

// Each slot accepts a drop or click-to-place from dragged color
function GuessSlot({
  color,
  index,
  onDrop,
  onClick,
  draggingColor,
  disabled,
}: {
  color: MmColor | null
  index: number
  onDrop: (index: number, color: MmColor) => void
  onClick: (index: number) => void
  draggingColor: MmColor | null
  disabled: boolean
}) {
  function handleDragOver(e: React.DragEvent) {
    if (!disabled) e.preventDefault()
  }
  function handleDrop(e: React.DragEvent) {
    if (disabled) return
    e.preventDefault()
    const c = e.dataTransfer.getData('color') as MmColor
    if (c) onDrop(index, c)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !disabled && onClick(index)}
      className={`w-12 h-12 rounded-xl border-2 cursor-pointer flex items-center justify-center transition-all ${
        color
          ? `${colorClass(color, 'bg')} ${colorClass(color, 'border')}`
          : draggingColor && !disabled
            ? 'border-primary-fixed-dim border-dashed bg-primary-fixed-dim/5'
            : 'border-outline-variant bg-surface-container-high'
      } ${disabled ? 'cursor-not-allowed' : 'hover:border-primary-fixed-dim'}`}
    />
  )
}

function DraggableColor({ c, disabled }: { c: typeof COLORS[0]; disabled: boolean }) {
  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('color', c.value)
  }
  return (
    <div
      draggable={!disabled}
      onDragStart={handleDragStart}
      className={`w-9 h-9 rounded-full ${c.bg} ${c.border} border-2 shadow-sm
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:scale-110 transition-transform'}`}
    />
  )
}

// ─── Pins display (exact = black, partial = white) ───────────────────────────

function Pins({ exact, partial }: { exact: number; partial: number }) {
  const pins: ('exact' | 'partial' | 'empty')[] = [
    ...Array(exact).fill('exact'),
    ...Array(partial).fill('partial'),
    ...Array(CODE_LENGTH - exact - partial).fill('empty'),
  ]
  return (
    <div className="grid grid-cols-2 gap-1 w-8">
      {pins.map((p, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full ${
            p === 'exact' ? 'bg-on-surface' :
            p === 'partial' ? 'bg-on-surface-variant border border-outline-variant' :
            'bg-surface-container-high border border-outline-variant'
          }`}
        />
      ))}
    </div>
  )
}

// ─── One player's board panel ─────────────────────────────────────────────────

function PlayerBoard({
  label,
  playerState,
  isMe,
  currentSlots,
  draggingColor,
  submitting,
  onSlotDrop,
  onSlotClick,
  onColorPick,
  onClear,
  onSubmit,
}: {
  label: string
  playerState: MmPlayerState
  isMe: boolean
  currentSlots: (MmColor | null)[]
  draggingColor: MmColor | null
  submitting: boolean
  onSlotDrop: (i: number, c: MmColor) => void
  onSlotClick: (i: number) => void
  onColorPick: (c: MmColor) => void
  onClear: () => void
  onSubmit: () => void
}) {
  const canSubmit = isMe && !playerState.solved && currentSlots.every(Boolean)

  return (
    <div className="flex-1 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
          {label}
        </span>
        {playerState.solved && (
          <span className="text-xs font-bold text-primary-fixed-dim bg-primary-fixed-dim/10 px-2 py-0.5 rounded-full">
            ✓ Gelöst!
          </span>
        )}
      </div>

      {/* Past guesses — or redacted opponent view */}
      {playerState.redacted ? (
        <div className="flex flex-col items-center justify-center py-4 gap-2">
          <span className="text-2xl font-bold text-on-surface tabular-nums">
            {playerState.attempts}
          </span>
          <span className="text-xs text-on-surface-variant">
            {playerState.attempts === 1 ? 'Versuch' : 'Versuche'}
          </span>
          {playerState.solved && (
            <span className="text-xs font-bold text-primary-fixed-dim bg-primary-fixed-dim/10 px-2 py-0.5 rounded-full mt-1">
              ✓ Gelöst!
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
          {playerState.guesses.map((row, ri) => (
            <div key={ri} className="flex items-center gap-2">
              <div className="flex gap-1">
                {row.guess.map((c, ci) => (
                  <div
                    key={ci}
                    className={`w-7 h-7 rounded-lg ${colorClass(c, 'bg')} ${colorClass(c, 'border')} border-2`}
                  />
                ))}
              </div>
              <Pins exact={row.exact} partial={row.partial} />
            </div>
          ))}

          {/* Empty remaining rows */}
          {Array(Math.max(0, MAX_GUESSES - playerState.guesses.length)).fill(null).map((_, ri) => (
            <div key={`empty-${ri}`} className="flex gap-1">
              {Array(CODE_LENGTH).fill(null).map((__, ci) => (
                <div
                  key={ci}
                  className="w-7 h-7 rounded-lg border border-outline-variant/30 bg-surface-container-low"
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Input row (only for active player) */}
      {isMe && !playerState.solved && (
        <div className="flex flex-col gap-3 pt-2 border-t border-outline-variant">
          {/* Drag sources */}
          <div className="flex gap-1.5 justify-center">
            {COLORS.map((c) => (
              <DraggableColor key={c.value} c={c} disabled={submitting} />
            ))}
          </div>

          {/* Drop targets */}
          <div className="flex gap-2 justify-center">
            {currentSlots.map((color, i) => (
              <GuessSlot
                key={i}
                color={color}
                index={i}
                onDrop={onSlotDrop}
                onClick={onSlotClick}
                draggingColor={draggingColor}
                disabled={submitting}
              />
            ))}
          </div>

          {/* Fallback: tap-to-place palette */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] text-on-surface-variant">Oder tippe Farbe zum Platzieren:</p>
            <ColorPalette onPick={onColorPick} disabled={submitting} />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onClear}
              disabled={submitting}
              className="flex-1 py-2 rounded-xl border border-outline-variant text-on-surface-variant
                text-sm font-semibold hover:bg-surface-container-high transition-colors disabled:opacity-40"
            >
              Leeren
            </button>
            <button
              onClick={onSubmit}
              disabled={!canSubmit || submitting}
              className="flex-1 py-2 rounded-xl bg-primary-fixed-dim text-on-primary-container
                font-bold text-sm disabled:opacity-40 transition-opacity"
            >
              {submitting ? '...' : 'Raten'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MastermindGame({
  beefId,
  socket,
  currentUserId,
  initiatorId,
  targetId,
  initiatorNickname,
  targetNickname,
  isParticipant,
}: MastermindGameProps) {
  const [initiatorState, setInitiatorState] = useState<MmPlayerState>({ guesses: [], solved: false, attempts: 0 })
  const [targetState, setTargetState] = useState<MmPlayerState>({ guesses: [], solved: false, attempts: 0 })
  const [currentSlots, setCurrentSlots] = useState<(MmColor | null)[]>(Array(CODE_LENGTH).fill(null))
  const [draggingColor, setDraggingColor] = useState<MmColor | null>(null)
  const [nextSlotIndex, setNextSlotIndex] = useState(0) // for tap-to-place
  const [submitting, setSubmitting] = useState(false)

  const isInitiator = currentUserId === initiatorId
  const isTarget = currentUserId === targetId

  // ── Fetch initial state ──────────────────────────────────────────────────
  useEffect(() => {
    fetchApi<MmGameState & { game_type: string }>(`/hidden/beef/${beefId}/game`)
      .then((gs) => {
        if (gs.game_type !== 'mastermind') return
        if (gs.initiator) setInitiatorState(gs.initiator)
        if (gs.target) setTargetState(gs.target)
      })
      .catch(() => { /* WS will update */ })
  }, [beefId])

  // ── Socket listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    function onBoardUpdate(data: MmGameState & { game_type: string }) {
      if (data.game_type !== 'mastermind') return
      setInitiatorState(data.initiator)
      setTargetState(data.target)
    }
    socket.on('game:board_update', onBoardUpdate)
    return () => { socket.off('game:board_update', onBoardUpdate) }
  }, [socket])

  // Track dragover color for visual feedback
  const dragColorRef = useRef<MmColor | null>(null)

  function handleSlotDrop(index: number, c: MmColor) {
    setCurrentSlots((prev) => {
      const next = [...prev]
      next[index] = c
      return next
    })
  }

  function handleSlotClick(index: number) {
    // Clear slot on click
    setCurrentSlots((prev) => {
      const next = [...prev]
      next[index] = null
      return next
    })
  }

  function handleColorPick(c: MmColor) {
    // Place in next empty slot
    setCurrentSlots((prev) => {
      const next = [...prev]
      const emptyIdx = next.findIndex((s) => s === null)
      if (emptyIdx !== -1) next[emptyIdx] = c
      return next
    })
  }

  function handleClear() {
    setCurrentSlots(Array(CODE_LENGTH).fill(null))
  }

  async function handleSubmit() {
    if (submitting || !currentSlots.every(Boolean)) return
    setSubmitting(true)
    try {
      await fetchApi(`/hidden/beef/${beefId}/game/move`, {
        method: 'POST',
        body: JSON.stringify({ move: { guess: currentSlots } }),
      })
      setCurrentSlots(Array(CODE_LENGTH).fill(null))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setSubmitting(false)
    }
  }

  const myState = isInitiator ? initiatorState : isTarget ? targetState : null
  const opponentState = isInitiator ? targetState : isTarget ? initiatorState : null

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 max-w-sm mx-auto w-full">
      <p className="text-center text-xs text-on-surface-variant uppercase tracking-widest font-semibold">
        Beide raten gleichzeitig
      </p>

      {/* Two boards side by side */}
      <div className="flex gap-4">
        {/* Initiator board */}
        <PlayerBoard
          label={`${initiatorNickname} (X)`}
          playerState={initiatorState}
          isMe={isInitiator && isParticipant}
          currentSlots={currentSlots}
          draggingColor={draggingColor}
          submitting={submitting}
          onSlotDrop={handleSlotDrop}
          onSlotClick={handleSlotClick}
          onColorPick={handleColorPick}
          onClear={handleClear}
          onSubmit={handleSubmit}
        />

        {/* Divider */}
        <div className="w-px bg-outline-variant self-stretch" />

        {/* Target board */}
        <PlayerBoard
          label={`${targetNickname} (O)`}
          playerState={targetState}
          isMe={isTarget && isParticipant}
          currentSlots={currentSlots}
          draggingColor={draggingColor}
          submitting={submitting}
          onSlotDrop={handleSlotDrop}
          onSlotClick={handleSlotClick}
          onColorPick={handleColorPick}
          onClear={handleClear}
          onSubmit={handleSubmit}
        />
      </div>

      {!isParticipant && (
        <p className="text-center text-xs text-on-surface-variant">Zuschauer — read only</p>
      )}
    </div>
  )
}
