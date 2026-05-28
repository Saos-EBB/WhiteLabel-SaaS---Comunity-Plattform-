'use client'

import { useEffect } from 'react'
import { fetchApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'

export function useHeartbeat(isReady: boolean) {
  useEffect(() => {
    if (!isReady) return
    const { accessToken } = useAuthStore.getState()
    if (!accessToken) return
    const id = setInterval(() => {
      fetchApi('/profile/me').catch(() => {})
    }, 2 * 60 * 1000)
    return () => clearInterval(id)
  }, [isReady])
}
