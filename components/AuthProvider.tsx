'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { fetchApi } from '@/lib/api'
import { useAuthStore, type User } from '@/lib/store/authStore'
import { useAccessibilityStore } from '@/lib/store/accessibilityStore'
import { connect, disconnect } from '@/lib/socket'
import { useNotificationStore } from '@/lib/store/notificationStore'
import { useConversationStore } from '@/lib/store/conversationStore'

interface MessagePayload {
  id: string
  sender_id: string
  conversation_id: string
  content: string
  sent_at: string
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const hasFetched = useRef(false)
  const router = useRouter()

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    const { accessToken, setUser } = useAuthStore.getState()
    if (!accessToken) return

    fetchApi<User>('/profile/me')
      .then((user) => {
        setUser(user)
        useAccessibilityStore.getState().applySettings(user)
        if (!user.onboarding_completed && !window.location.pathname.startsWith('/onboarding')) {
          router.push('/onboarding')
        }

        const sock = connect(accessToken)
        sock.on('new_message', (msg: MessagePayload) => {
          useConversationStore.getState().applyMessage(msg)

          const myId =
            (useAuthStore.getState().user as any)?.user_id ??
            useAuthStore.getState().user?.id
          if (msg.sender_id !== myId) {
            const store = useNotificationStore.getState()
            if (store.activeConversationId === msg.conversation_id) return
            store.addOrUpdateNotification({
              id: `temp-msg-${msg.id}`,
              type: 'message',
              content: 'Neue Nachricht',
              is_read: false,
              created_at: new Date().toISOString(),
              conversation_id: msg.conversation_id,
              _local: true,
            })
          }
        })
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
