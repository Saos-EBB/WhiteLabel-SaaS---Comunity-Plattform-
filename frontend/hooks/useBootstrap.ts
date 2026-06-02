'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchApi } from '@/lib/api'
import { useAuthStore, type User } from '@/lib/store/authStore'
import { useAccessibilityStore } from '@/lib/store/accessibilityStore'
import { initProfanityFilter } from '@/lib/profanity'

export function useBootstrap() {
  const hasFetched = useRef(false)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    const { setUser, setBanned } = useAuthStore.getState()

    fetchApi<User>('/profile/me')
      .then((user) => {
        setUser(user)
        if (user.is_banned === true) {
          setBanned(true)
        }
        initProfanityFilter().catch(() => {})
        useAccessibilityStore.getState().applySettings({
          font_size: user.font_size,
          high_contrast: user.high_contrast,
          lang_simple: user.lang_simple,
        })
        if (!user.is_banned && !user.onboardingCompleted) {
          if (!window.location.pathname.startsWith('/onboarding')) {
            router.push('/onboarding')
          }
        }
        setIsLoading(false)
        setIsReady(true)
      })
      .catch((err: unknown) => {
        if (!(err instanceof Error && err.message === 'Session expired')) {
          console.error('[AuthProvider] profile fetch failed:', err)
        }
        setIsLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { isLoading, isReady }
}
