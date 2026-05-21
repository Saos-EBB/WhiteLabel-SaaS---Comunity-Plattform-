'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { fetchApi } from '@/lib/api'
import { useAuthStore, type User } from '@/lib/store/authStore'
import { useAccessibilityStore } from '@/lib/store/accessibilityStore'
import { connect, disconnect } from '@/lib/socket'
import { useNotificationStore } from '@/lib/store/notificationStore'
import { useConversationStore } from '@/lib/store/conversationStore'
import { useToastStore } from '@/lib/store/toastStore'
import { initProfanityFilter } from '@/lib/profanity'

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

  // ── Heartbeat — keeps last_active_at fresh every 2 min ───────────────────
  useEffect(() => {
    const { accessToken } = useAuthStore.getState()
    if (!accessToken) return
    const id = setInterval(() => {
      fetchApi('/profile/me').catch(() => { })
    }, 2 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    const { accessToken, setUser } = useAuthStore.getState()
    if (!accessToken) {
      router.replace('/login')
      return
    }

    fetchApi<User>('/profile/me')
      .then((user) => {
        setUser(user)
        initProfanityFilter().catch(() => {})
        useAccessibilityStore.getState().applySettings({
          font_size: user.font_size,
          high_contrast: user.high_contrast,
          lang_simple: user.lang_simple,
        })
        if (!user.onboarding_completed && !window.location.pathname.startsWith('/onboarding')) {
          router.push('/onboarding')
        }

        const sock = connect()

        const socketHandlers: Record<string, (data: any) => void> = {
          new_message: (msg: MessagePayload) => {
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
          },
          notification: (notification) => {
            useNotificationStore.getState().addOrUpdateNotification(notification)
          },
          contact_request: (request) => {
            useNotificationStore.getState().addOrUpdateNotification({
              id: `temp-req-${request.id}`,
              type: 'request',
              content: 'Neue Kontaktanfrage',
              is_read: false,
              created_at: new Date().toISOString(),
              _local: true,
            })
          },
          contact_request_accepted: (payload: { conversationId: string; acceptedByNickname: string }) => {
            useToastStore.getState().addToast({
              nickname: payload.acceptedByNickname,
              conversationId: payload.conversationId,
            })
          },
        }

        for (const [event, handler] of Object.entries(socketHandlers)) {
          sock.on(event, handler)
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
