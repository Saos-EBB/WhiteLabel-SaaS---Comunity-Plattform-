'use client'

import { useEffect, useState } from 'react'

export function useCountdown(endsAt: string | Date | null): string {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    if (!endsAt) return
    function tick() {
      const diff = new Date(endsAt as string | Date).getTime() - Date.now()
      if (diff <= 0) { setRemaining('Vorbei'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`)
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [endsAt])

  return remaining
}
