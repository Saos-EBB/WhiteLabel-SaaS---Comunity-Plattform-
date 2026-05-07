'use client'

import { useEffect, useRef } from 'react'
import { fetchApi } from '@/lib/api'
import { useAuthStore, type User } from '@/lib/store/authStore'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const hasFetched = useRef(false)

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    const { accessToken, setUser } = useAuthStore.getState()
    if (!accessToken) return

    fetchApi<User>('/profile/me')
      .then(setUser)
      .catch((err: unknown) => {
        // fetchApi already handles 401 → refresh → logout() + redirect to /login
        if (!(err instanceof Error && err.message === 'Session expired')) {
          console.error('[AuthProvider] profile fetch failed:', err)
        }
      })
  }, [])

  return <>{children}</>
}
