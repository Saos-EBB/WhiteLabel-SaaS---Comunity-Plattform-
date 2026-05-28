import { create } from 'zustand'

export type NotificationType =
  'message' | 'match' | 'system' | 'ban' | 'request' |
  'beef_request' | 'beef_accepted' | 'beef_won' | 'beef_lost'

export interface Notification {
  id: string
  type: NotificationType
  content: string
  is_read: boolean
  created_at: string
  count?: number
  conversation_id?: string
  /** True for client-generated notifications that have no backend record. */
  _local?: true
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  activeConversationId: string | null
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  addOrUpdateNotification: (notification: Notification) => void
  markRead: (id: string) => void
  markAllRead: () => void
  removeNotification: (id: string) => void
  setActiveConversationId: (id: string) => void
  clearActiveConversationId: () => void
  adminTicketCount: number
  setAdminTicketCount: (n: number) => void
  incrementAdminTicketCount: () => void
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  unreadCount: 0,
  activeConversationId: null,
  setNotifications: (incoming) =>
    set((state) => {
      const merged = [
        ...incoming,
        ...state.notifications.filter(
          (n) => n._local && !incoming.some((b) => b.id === n.id)
        ),
      ]
      return { notifications: merged, unreadCount: merged.filter((n) => !n.is_read).length }
    }),
  addNotification: (notification) =>
    set((state) => {
      if (state.notifications.some((n) => n.id === notification.id)) return state
      const notifications = [notification, ...state.notifications]
      return { notifications, unreadCount: notifications.filter((n) => !n.is_read).length }
    }),
  addOrUpdateNotification: (notification) =>
    set((state) => {
      // Group message notifications by conversation
      if (notification.type === 'message' && notification.conversation_id) {
        const idx = state.notifications.findIndex(
          (n) =>
            n.type === 'message' &&
            !n.is_read &&
            n.conversation_id === notification.conversation_id
        )
        if (idx !== -1) {
          const existing = state.notifications[idx]
          const newCount = (existing.count ?? 1) + 1
          const notifications = [...state.notifications]
          notifications[idx] = {
            ...existing,
            count: newCount,
            content: `${newCount} neue Nachrichten`,
            created_at: notification.created_at,
          }
          return { notifications, unreadCount: notifications.filter((n) => !n.is_read).length }
        }
      }

      // Group all request notifications into a single entry; count may be batched (>1)
      if (notification.type === 'request') {
        const idx = state.notifications.findIndex(
          (n) => n.type === 'request' && !n.is_read
        )
        const addCount = notification.count ?? 1
        if (idx !== -1) {
          const existing = state.notifications[idx]
          const newCount = (existing.count ?? 1) + addCount
          const notifications = [...state.notifications]
          notifications[idx] = {
            ...existing,
            count: newCount,
            content: newCount === 1 ? '1 neue Kontaktanfrage' : `${newCount} neue Kontaktanfragen`,
            created_at: notification.created_at,
          }
          return { notifications, unreadCount: notifications.filter((n) => !n.is_read).length }
        }
        const count = addCount
        const content = count === 1 ? '1 neue Kontaktanfrage' : `${count} neue Kontaktanfragen`
        const notifications = [{ ...notification, count, content }, ...state.notifications]
        return { notifications, unreadCount: notifications.filter((n) => !n.is_read).length }
      }

      if (state.notifications.some((n) => n.id === notification.id)) return state
      const notifications = [{ ...notification, count: 1 }, ...state.notifications]
      return { notifications, unreadCount: notifications.filter((n) => !n.is_read).length }
    }),
  markRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      )
      return { notifications, unreadCount: notifications.filter((n) => !n.is_read).length }
    }),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    })),
  removeNotification: (id) =>
    set((state) => {
      const notifications = state.notifications.filter((n) => n.id !== id)
      return { notifications, unreadCount: notifications.filter((n) => !n.is_read).length }
    }),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  clearActiveConversationId: () => set({ activeConversationId: null }),
  adminTicketCount: 0,
  setAdminTicketCount: (n) => set({ adminTicketCount: n }),
  incrementAdminTicketCount: () => set((s) => ({ adminTicketCount: s.adminTicketCount + 1 })),
}))
