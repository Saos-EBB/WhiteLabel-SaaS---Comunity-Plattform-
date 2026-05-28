'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import { useHiddenStore } from '@/lib/store/hiddenStore'
import { stopHiddenAudio } from '@/lib/hiddenAudio'

export function HiddenInitializer() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const isHidden    = useHiddenStore((s) => s.isHidden)
  const theme       = useHiddenStore((s) => s.theme)

  const isFirstRun = useRef(true)
  const prevToken  = useRef(accessToken)

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      prevToken.current = accessToken
      return
    }
    // Only lock on actual logout: token went from present → null
    if (prevToken.current !== null && accessToken === null) {
      useHiddenStore.getState().lock()
      stopHiddenAudio()
    }
    prevToken.current = accessToken
  }, [accessToken])

  // Apply / remove underground theme classes
  useEffect(() => {
    const html = document.documentElement
    const UNDERGROUND = ['underground-brick', 'underground-neon']
    const NORMAL = ['dark', 'light']

    if (isHidden) {
      // Save current normal theme, remove it, apply underground
      const currentNormal = NORMAL.find(c => html.classList.contains(c)) ?? 'dark'
      html.dataset.savedTheme = currentNormal
      NORMAL.forEach(c => html.classList.remove(c))
      UNDERGROUND.forEach(c => html.classList.remove(c))
      html.classList.add(theme === 'brick' ? 'underground-brick' : 'underground-neon')
    } else {
      // Remove underground, restore saved normal theme
      UNDERGROUND.forEach(c => html.classList.remove(c))
      const saved = html.dataset.savedTheme ?? 'dark'
      html.classList.add(saved)
      delete html.dataset.savedTheme
    }
  }, [isHidden, theme])

  return null
}
