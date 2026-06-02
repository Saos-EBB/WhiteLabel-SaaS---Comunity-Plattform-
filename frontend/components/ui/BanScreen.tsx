'use client'

import { useEffect } from 'react'
import { PUBLIC_CONFIG } from '@/config/public.config'
import { useAuthStore } from '@/lib/store/authStore'
import { fetchApi } from '@/lib/api'

export default function BanScreen() {
  useEffect(() => {
    const files = PUBLIC_CONFIG.banScreen.audioFiles
    const file  = files[Math.floor(Math.random() * files.length)]
    try {
      const audio = new Audio(`/ban-audio/${file}`)
      audio.loop = true
      audio.play().catch(() => {})
    } catch {}
  }, [])

  async function handleBanLogout() {
    try {
      await fetchApi('/auth/logout', { method: 'POST' })
    } catch {}
    useAuthStore.getState().clearAuth()
    window.location.replace('/login')
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-md bg-black/75"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex flex-col items-center gap-10 px-8 text-center">

        {/* Rubber-stamp text */}
        <div
          style={{
            transform: 'rotate(-10deg)',
            border: '3px solid rgba(220, 38, 38, 0.75)',
            borderRadius: '4px',
            padding: '12px 24px',
            display: 'inline-block',
          }}
        >
          <span
            style={{
              fontFamily: 'serif',
              fontSize: '2rem',
              fontWeight: 900,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(220, 38, 38, 0.85)',
              lineHeight: 1.1,
              display: 'block',
            }}
          >
            {PUBLIC_CONFIG.banScreen.text}
          </span>
        </div>

        <button
          onClick={() => { void handleBanLogout() }}
          className="px-6 py-2.5 rounded-full border border-white/40 text-white/80 text-sm font-medium hover:bg-white/10 transition-colors"
        >
          Abmelden
        </button>
      </div>
    </div>
  )
}
