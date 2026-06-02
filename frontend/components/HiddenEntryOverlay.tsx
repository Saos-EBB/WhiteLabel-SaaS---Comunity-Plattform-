'use client'

import { useEffect, useRef, useState } from 'react'
import { useHiddenStore } from '@/lib/store/hiddenStore'
import { useHiddenZone } from '@/hooks/useHiddenZone'
import { playHiddenAudio, MASTER_KEY } from '@/hooks/useHiddenZone'
import { triggerExplosion, cleanup } from '@/lib/physics/letterPhysics'
import { useLanguageStore } from '@/lib/store/languageStore'

// ─── Film data ────────────────────────────────────────────────────────────────

interface FilmEntry {
  id: string
  title: string
  password: string
  audio: string
  quotes: string[]
}

const FILMS: FilmEntry[] = [
  {
    id: 'reservoir-dogs',
    title: 'Reservoir Dogs (1992)',
    password: 'reservoirdogs',
    audio: '/sounds/reservoir-dogs.mp3',
    quotes: [
      'Are you gonna bark all day, little doggie, or are you gonna bite?',
      'Stuck in the middle with you.',
      'Why am I Mr. Pink?',
      "Because you're a f***ot, all right?",
      "I don't tip.",
      'You shoot me in a dream, you better wake up and apologize.',
      "Let's go to work.",
      "I'm hungry. Let's get a taco.",
      'You kill anybody?',
      "You're acting like a first-year thief.",
    ],
  },
  {
    id: 'fight-club',
    title: 'Fight Club (1999)',
    password: 'fightclub',
    audio: '/sounds/where_is_my_mind.mp3',
    quotes: [
      'The first rule of Fight Club is: You do not talk about Fight Club.',
      'The second rule of Fight Club is: You do not talk about Fight Club.',
      "It's only after we've lost everything that we're free to do anything.",
      'I want you to hit me as hard as you can.',
      "This is your life, and it's ending one minute at a time.",
      'You are not your job.',
      "We buy things we don't need with money we don't have.",
      'The things you own end up owning you.',
      "It's a dangerous thing to confuse children with angels.",
      'You met me at a very strange time in my life.',
    ],
  },
  {
    id: 'clockwork-orange',
    title: 'A Clockwork Orange (1971)',
    password: 'aclockworkorange',
    audio: '/sounds/clockwork-orange.mp3',
    quotes: [
      "What's it going to be then, eh?",
      'There was me, that is Alex, and my three droogs.',
      'Viddy well, little brother.',
      'A bit of the old ultra-violence.',
      'Come and get one in the yarbles, if you have any yarbles.',
      'The colors of the real world only seem really real when you viddy them on the screen.',
      "It's funny how the colors of the real world only seem really real when you viddy them on the screen.",
      'I was cured all right.',
      'Goodness comes from within. Goodness is chosen.',
      'And there I was, right back where I wanted to be.',
    ],
  },
  {
    id: 'american-psycho',
    title: 'American Psycho (2000)',
    password: 'americanpsycho',
    audio: '/sounds/american-psycho.mp3',
    quotes: [
      'I have to return some videotapes.',
      'Do you like Huey Lewis and the News?',
      'Their early work was a little too new wave for my taste.',
      'Try getting a reservation at Dorsia now.',
      'I simply am not there.',
      'There is an idea of a Patrick Bateman.',
      'I want to fit in.',
      'This confession has meant nothing.',
      'My pain is constant and sharp.',
      'Hip to Be Square.',
    ],
  },
  {
    id: 'trainspotting',
    title: 'Trainspotting (1996)',
    password: 'trainspotting',
    audio: '/sounds/trainspotting.mp3',
    quotes: [
      'Choose life.',
      'Choose a job.',
      'Choose a career.',
      'Choose a family.',
      'Choose a f***ing big television.',
      "People think it's all about misery and desperation.",
      'Who needs reasons when you got heroin?',
      "It's shite being Scottish.",
      'I chose not to choose life.',
      'I\'m going to be just like you. The job, the family, the washing machine.',
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffledIndices(len: number): number[] {
  const arr = Array.from({ length: len }, (_, i) => i)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HiddenEntryOverlay() {
  const { unlock } = useHiddenZone()
  const showPWOverlay = useHiddenStore((s) => s.showPWOverlay)
  const closeOverlay  = useHiddenStore((s) => s.closeOverlay)
  const setUiLang     = useLanguageStore((s) => s.setUiLang)

  // Pick film once per overlay lifecycle
  const sessionRef = useRef<{
    film: FilmEntry
    remaining: number[]
  } | null>(null)

  if (!sessionRef.current) {
    const film = FILMS[Math.floor(Math.random() * FILMS.length)]
    sessionRef.current = { film, remaining: shuffledIndices(film.quotes.length) }
  }

  const film = sessionRef.current.film

  const [quoteIdx, setQuoteIdx] = useState(() => sessionRef.current!.remaining.pop()!)
  const [typePos, setTypePos]   = useState(0)
  const [fading, setFading]     = useState(false)
  const [value, setValue]       = useState('')
  const [shaking, setShaking]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Start film audio when overlay opens, clean up physics on unmount
  useEffect(() => {
    if (!showPWOverlay) return
    playHiddenAudio(film.audio)
  }, [showPWOverlay, film.audio])

  useEffect(() => () => { cleanup() }, [])

  // Typewriter — advance one character every 40 ms
  useEffect(() => {
    const quote = film.quotes[quoteIdx]
    if (typePos >= quote.length) return
    const t = setTimeout(() => setTypePos((p) => p + 1), 40)
    return () => clearTimeout(t)
  }, [typePos, quoteIdx, film.quotes])

  function nextQuote() {
    const session = sessionRef.current!
    if (session.remaining.length === 0) {
      session.remaining = shuffledIndices(film.quotes.length)
    }
    const next = session.remaining.pop()!
    setFading(true)
    setTimeout(() => {
      setQuoteIdx(next)
      setTypePos(0)
      setFading(false)
    }, 400)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return

    const input = value
    const normalized = input.toLowerCase().replace(/\s+/g, '')
    const correct = input === MASTER_KEY || normalized === film.password

    if (correct) {
      setValue('')
      triggerExplosion(() => { unlock(); setUiLang('leet'); closeOverlay() })
      return
    }

    setValue('')
    setShaking(true)
    setTimeout(() => {
      setShaking(false)
      inputRef.current?.focus()
    }, 450)
    nextQuote()
  }

  if (!showPWOverlay) return null

  const quote      = film.quotes[quoteIdx]
  const displayed  = quote.slice(0, typePos)
  const isTyping   = typePos < quote.length

  return (
    <div
      className="fixed inset-0 z-[100] bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Hidden area entry"
    >
      {/* Quote — centered in upper 60% */}
      <div className="absolute inset-x-0 top-0 h-[60%] flex items-center justify-center px-12 pt-16">
        <p
          className="text-2xl italic text-white/50 text-center max-w-2xl leading-relaxed transition-opacity duration-[400ms]"
          style={{ opacity: fading ? 0 : 1 }}
        >
          {displayed}
          {isTyping && <span className="animate-pulse opacity-60">|</span>}
        </p>
      </div>

      {/* Password input — bottom center */}
      <div className="absolute bottom-16 inset-x-0 flex justify-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder=""
          autoFocus
          autoComplete="off"
          className={`w-[40%] min-w-[260px] rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/20 px-4 py-3 text-sm outline-none focus:border-white/30 transition-colors${shaking ? ' shake-wrong' : ''}`}
        />
      </div>
    </div>
  )
}
