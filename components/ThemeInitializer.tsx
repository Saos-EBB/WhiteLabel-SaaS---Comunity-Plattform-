'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/lib/store/themeStore'

export function ThemeInitializer() {
  useEffect(() => {
    const theme = useThemeStore.getState().theme
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
  }, [])
  return null
}
