'use client'

import { Heart } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

export default function MatchesPage() {
  const { t } = useTranslation()
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center pb-24 sm:pb-8">
      <Heart className="h-14 w-14 text-primary-fixed-dim" fill="currentColor" aria-hidden />
      <h1 className="text-2xl font-bold text-on-surface">{t.nav.matches}</h1>
      <p className="text-on-surface-variant text-sm max-w-xs">{t.common.comingSoon}</p>
    </main>
  )
}
