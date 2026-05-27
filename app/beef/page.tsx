'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useHiddenStore } from '@/lib/store/hiddenStore'

type Tab = 'public' | 'highscore'

export default function BeefPage() {
  const router   = useRouter()
  const isHidden = useHiddenStore((s) => s.isHidden)
  const [tab, setTab] = useState<Tab>('public')

  useEffect(() => {
    if (!isHidden) {
      router.replace('/dashboard')
    }
  }, [isHidden, router])

  if (!isHidden) return null

  return (
    <div className="mx-auto max-w-screen-md px-4 py-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface">Beef 🥊</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Underground challenges &amp; rankings</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant mb-6">
        {(['public', 'highscore'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === t
                ? 'text-primary-fixed-dim border-b-2 border-primary-fixed-dim'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t === 'public' ? 'Public Beefs' : 'Highscore'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'public' && (
        <div className="rounded-2xl bg-surface-container border border-outline-variant p-8 text-center">
          <p className="text-3xl mb-3">🥊</p>
          <p className="text-on-surface font-medium">No beefs yet</p>
          <p className="text-sm text-on-surface-variant mt-1">Public challenges will appear here.</p>
        </div>
      )}

      {tab === 'highscore' && (
        <div className="rounded-2xl bg-surface-container border border-outline-variant p-8 text-center">
          <p className="text-3xl mb-3">🏆</p>
          <p className="text-on-surface font-medium">No scores yet</p>
          <p className="text-sm text-on-surface-variant mt-1">The leaderboard will appear here.</p>
        </div>
      )}

    </div>
  )
}
