import { create } from 'zustand'

export type NotificationType = 'message' | 'match' | 'system' | 'ban' | 'request'

export interface Notification {
  id: string
  type: NotificationType
  content: string
  is_read: boolean
  created_at: string
  /** True for client-generated notifications that have no backend record. */
  _local?: true
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  markRead: (id: string) => void
  markAllRead: () => void
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  unreadCount: 0,
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
}))
