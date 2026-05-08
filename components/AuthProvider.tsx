'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { fetchApi } from '@/lib/api'
import { useAuthStore, type User } from '@/lib/store/authStore'
import { useAccessibilityStore } from '@/lib/store/accessibilityStore'
import { connect, disconnect } from '@/lib/socket'
import { useNotificationStore } from '@/lib/store/notificationStore'

interface MessagePayload {
  id: string
  sender_id: string
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const hasFetched = useRef(false)
  const router = useRouter()

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    const { accessToken, setUser } = useAuthStore.getState()
    if (!accessToken) return

    const { accessToken: token } = useAuthStore.getState()

    fetchApi<User>('/profile/me')
      .then((user) => {
        setUser(user)
        useAccessibilityStore.getState().applySettings(user)
        if (!user.onboarding_completed && !window.location.pathname.startsWith('/onboarding')) {
          router.push('/onboarding')
        }

        if (token) {
          const sock = connect(token)
          sock.on('new_message', (msg: MessagePayload) => {
            const myId =
              (useAuthStore.getState().user as any)?.user_id ??
              useAuthStore.getState().user?.id
            if (msg.sender_id !== myId) {
              useNotificationStore.getState().addNotification({
                id: `temp-msg-${msg.id}`,
                type: 'message',
                content: 'Neue Nachricht',
                is_read: false,
                created_at: new Date().toISOString(),
                _local: true,
              })
            }
          })
        }
      })
      .catch((err: unknown) => {
        // fetchApi already handles 401 → refresh → logout() + redirect to /login
        if (!(err instanceof Error && err.message === 'Session expired')) {
          console.error('[AuthProvider] profile fetch failed:', err)
        }
      })

    return () => { disconnect() }
  }, [router])

  return <>{children}</>
}
