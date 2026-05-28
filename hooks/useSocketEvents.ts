'use client'

import { useEffect } from 'react'
import { connect, disconnect } from '@/lib/socket'
import { useAuthStore } from '@/lib/store/authStore'
import { useNotificationStore } from '@/lib/store/notificationStore'
import { useConversationStore } from '@/lib/store/conversationStore'
import { useToastStore } from '@/lib/store/toastStore'

interface MessagePayload {
  id: string
  sender_id: string
  conversation_id: string
  content: string
  sent_at: string
  sender_nickname?: string
}

export function useSocketEvents(isReady: boolean) {
  useEffect(() => {
    if (!isReady) return

    const sock = connect()

    const handlers: Record<string, (data: any) => void> = {
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
            content: `${msg.sender_nickname ?? 'Jemand'} hat dir eine Nachricht geschickt.`,
            is_read: false,
            created_at: new Date().toISOString(),
            conversation_id: msg.conversation_id,
            _local: true,
          })
        }
      },
      notification: (notification: any) => {
        useNotificationStore.getState().addOrUpdateNotification(notification)
      },
      contact_request: (request: any) => {
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
      'user.banned': () => {
        useAuthStore.getState().clearAuth()
        useAuthStore.getState().setBanned(true)
      },
      'user.unbanned': () => {
        useAuthStore.getState().setBanned(false)
      },
    }

    for (const [event, handler] of Object.entries(handlers)) {
      sock.on(event, handler)
    }

    return () => { disconnect() }
  }, [isReady])
}
