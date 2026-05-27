'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import { useHiddenStore } from '@/lib/store/hiddenStore'
import { stopHiddenAudio } from '@/lib/hiddenAudio'

export function HiddenInitializer() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const isHidden    = useHiddenStore((s) => s.isHidden)
  const theme       = useHiddenStore((s) => s.theme)

  // Lock hidden state on logout
  useEffect(() => {
    if (accessToken === null) {
      useHiddenStore.getState().lock()
      stopHiddenAudio()
    }
  }, [accessToken])

  // Apply / remove underground theme classes
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('underground-brick', 'underground-neon')
    if (isHidden) {
      root.classList.add(theme === 'brick' ? 'underground-brick' : 'underground-neon')
    }
  }, [isHidden, theme])

  return null
}
