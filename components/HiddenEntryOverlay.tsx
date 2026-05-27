'use client'

import { useEffect, useRef, useState } from 'react'
import { useHiddenStore } from '@/lib/store/hiddenStore'
import { spawnTextLetters, triggerExplosion, cleanup } from '@/lib/physics/letterPhysics'

const CORRECT_PASSWORD = 'DoNotTalkAboutTheFightClub'

// ─── Tally marks ──────────────────────────────────────────────────────────────

function TallyGroup() {
  return (
    <svg
      viewBox="0 0 34 24"
      width="34"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {/* 4 vertical lines */}
      <line x1="5"  y1="2" x2="5"  y2="22" />
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="19" y1="2" x2="19" y2="22" />
      <line x1="26" y1="2" x2="26" y2="22" />
      {/* diagonal crossing all four */}
      <line x1="1" y1="21" x2="32" y2="3" />
    </svg>
  )
}

function TallyRemainder({ count }: { count: number }) {
  if (count === 0) return null
  const xs = [5, 12, 19, 26]
  return (
    <svg
      viewBox="0 0 34 24"
      width="34"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {xs.slice(0, count).map((x) => (
        <line key={x} x1={x} y1="2" x2={x} y2="22" />
      ))}
    </svg>
  )
}

function TallyMarks({ count }: { count: number }) {
  if (count === 0) return null
  const groups    = Math.floor(count / 5)
  const remainder = count % 5
  return (
    <div className="flex items-center gap-1 flex-wrap text-on-surface-variant" aria-label={`${count} failed attempt${count !== 1 ? 's' : ''}`}>
      {Array.from({ length: groups }).map((_, i) => <TallyGroup key={i} />)}
      <TallyRemainder count={remainder} />
    </div>
  )
}

// ─── Overlay ──────────────────────────────────────────────────────────────────

export function HiddenEntryOverlay() {
  const showPWOverlay          = useHiddenStore((s) => s.showPWOverlay)
  const passwordAttempts       = useHiddenStore((s) => s.passwordAttempts)
  const unlock                 = useHiddenStore((s) => s.unlock)
  const closeOverlay           = useHiddenStore((s) => s.closeOverlay)
  const incrementPasswordAttempts = useHiddenStore((s) => s.incrementPasswordAttempts)

  const [value, setValue] = useState('')
  const [shaking, setShaking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cleanup any dangling physics elements when this overlay unmounts
  useEffect(() => () => { cleanup() }, [])

  if (!showPWOverlay) return null

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    if (value === CORRECT_PASSWORD) {
      setValue('')
      triggerExplosion(() => { unlock(); closeOverlay() })
    } else {
      const attempted = value
      setValue('')
      incrementPasswordAttempts()
      setShaking(true)
      setTimeout(() => {
        setShaking(false)
        if (inputRef.current) spawnTextLetters(attempted, inputRef.current)
        inputRef.current?.focus()
      }, 450)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Hidden area entry"
    >
      <div className="flex flex-col gap-6 mx-auto mt-[30vh] w-full max-w-sm rounded-2xl bg-surface-container border border-outline-variant p-8 shadow-2xl">

        {/* Icon */}
        <p className="text-4xl text-center select-none" aria-hidden="true">🥊</p>

        {/* Subtitle */}
        <p className="text-sm text-center text-on-surface-variant">
          Omerta.
        </p>

        {/* Password input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="..."
          autoFocus
          autoComplete="off"
          className={`w-full rounded-lg bg-surface-container-low border border-outline-variant text-on-surface placeholder:text-on-surface-variant px-4 py-3 text-sm outline-none focus:border-primary-fixed-dim transition-colors${shaking ? ' shake-wrong' : ''}`}
        />

        {/* Tally marks for failed attempts */}
        {passwordAttempts > 0 && (
          <div className="flex justify-center">
            <TallyMarks count={passwordAttempts} />
          </div>
        )}

      </div>
    </div>
  )
}
