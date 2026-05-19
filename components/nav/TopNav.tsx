'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Sun, Bell, MessageCircle, Heart, Info, ShieldX, UserPlus, Trash2, User } from 'lucide-react'
import { useEffect, useRef, useState, type ElementType } from 'react'
import {
  useNotificationStore,
  type Notification as AppNotification,
  type NotificationType,
} from '@/lib/store/notificationStore'
import { fetchApi } from '@/lib/api'

const navLinks = [
  { href: '/discover', label: 'Discover' },
  { href: '/requests', label: 'Requests' },
  { href: '/chat', label: 'Chat' },
]

const TYPE_ICONS: Record<NotificationType, ElementType> = {
  message: MessageCircle,
  match:   Heart,
  system:  Info,
  ban:     ShieldX,
  request: UserPlus,
}

const TYPE_ROUTES: Record<NotificationType, string> = {
  message: '/chat',
  match:   '/notifications',
  system:  '/notifications',
  ban:     '/notifications',
  request: '/requests',
}

function relativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'gerade eben'
  if (mins < 60) return `vor ${mins} Min.`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.floor(hours / 24)
  return `vor ${days} Tag${days !== 1 ? 'en' : ''}`
}

interface IncomingRequest {
  id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

type IncomingEnvelope = IncomingRequest[] | { data: IncomingRequest[] }

function normaliseRequests(res: IncomingEnvelope): IncomingRequest[] {
  return Array.isArray(res) ? res : (res?.data ?? [])
}

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'neu' | 'verlauf'>('neu')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Tracks request IDs seen on the first poll so we only notify for genuinely new ones.
  const seenRequestIdsRef = useRef(new Set<string>())
  const isFirstRequestPollRef = useRef(true)

  const notifications = useNotificationStore((s) => s.notifications)
  const unreadCount   = useNotificationStore((s) => s.unreadCount)

  // Poll notifications + pending requests on mount and every 30 s
  useEffect(() => {
    async function load() {
      // Backend notification list — replaces store (clears temp entries too)
      try {
        const data = await fetchApi<AppNotification[]>('/notifications')
        useNotificationStore.getState().setNotifications(data)
      } catch {
        // non-critical
      }

      // Incoming requests — inject a notification for each new pending entry
      try {
        const res = await fetchApi<IncomingEnvelope>('/chat/requests/incoming')
        const pending = normaliseRequests(res).filter((r) => r.status === 'pending')

        if (isFirstRequestPollRef.current) {
          // Seed known IDs on first poll without generating notifications
          pending.forEach((r) => seenRequestIdsRef.current.add(r.id))
          isFirstRequestPollRef.current = false
        } else {
          for (const r of pending) {
            if (!seenRequestIdsRef.current.has(r.id)) {
              seenRequestIdsRef.current.add(r.id)
              useNotificationStore.getState().addNotification({
                id: r.id,
                type: 'request',
                content: 'Neue Kontaktanfrage',
                is_read: false,
                created_at: r.created_at,
                _local: true,
              })
            }
          }
        }
      } catch {
        // non-critical
      }
    }

    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  function handleNotificationClick(n: AppNotification) {
    setOpen(false)
    if (!n.is_read) {
      useNotificationStore.getState().markRead(n.id)
      // Skip PATCH for local notifications that have no backend record
      if (!n._local) {
        fetchApi(`/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {})
      }
    }
    router.push(TYPE_ROUTES[n.type])
  }

  async function handleMarkAllRead() {
    useNotificationStore.getState().markAllRead()
    try {
      await fetchApi('/notifications/read-all', { method: 'PATCH' })
    } catch {
      // optimistic update already applied
    }
  }

  async function handleDelete(n: AppNotification) {
    if (!n._local) {
      try {
        await fetchApi(`/notifications/${n.id}`, { method: 'DELETE' })
      } catch {
        return
      }
    }
    useNotificationStore.getState().removeNotification(n.id)
  }

  const tabNotifications = notifications
    .filter((n) => activeTab === 'neu' ? !n.is_read : n.is_read)
    .slice(0, 5)

  return (
    <header className="sticky top-0 z-50 bg-surface-container-low/80 backdrop-blur-md border-b border-outline-variant">
      <nav
        className="mx-auto flex h-16 max-w-screen-lg items-center px-4"
        aria-label="Main navigation"
      >
        <Link
          href="/dashboard"
          className="text-xl font-bold text-on-surface tracking-tight"
          aria-label="XXX home"
        >
          XXX
        </Link>

        <ul className="hidden md:flex items-center gap-1 ml-8" role="list">
          {navLinks.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-primary-fixed-dim'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <button
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <Sun size={20} aria-hidden />
          </button>

          {/* Bell with dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              aria-label={`Benachrichtigungen${unreadCount > 0 ? `, ${unreadCount} ungelesen` : ''}`}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className={`relative p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors ${
                unreadCount > 0 ? 'animate-pulse ring-2 ring-offset-1 ring-[#73db9a]' : ''
              }`}
            >
              <Bell size={20} aria-hidden />
              {unreadCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-on-error text-[10px] font-bold leading-none"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {open && (
              <div
                role="dialog"
                aria-label="Benachrichtigungen"
                className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-surface-container border border-outline-variant shadow-xl z-50 overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
                  <span className="text-sm font-semibold text-on-surface">Benachrichtigungen</span>
                  {activeTab === 'neu' && unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-primary-fixed-dim hover:opacity-75 transition-opacity"
                    >
                      Alle als gelesen
                    </button>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-outline-variant">
                  {(['neu', 'verlauf'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                        activeTab === tab
                          ? 'text-primary-fixed-dim border-b-2 border-primary-fixed-dim'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {tab === 'neu'
                        ? unreadCount > 0 ? `Neu (${unreadCount})` : 'Neu'
                        : 'Verlauf'}
                    </button>
                  ))}
                </div>

                {/* Notification list */}
                {tabNotifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-on-surface-variant">
                    {activeTab === 'neu' ? 'Keine neuen Benachrichtigungen' : 'Kein Verlauf'}
                  </p>
                ) : (
                  <ul>
                    {tabNotifications.map((n) => {
                      const Icon = TYPE_ICONS[n.type]
                      return (
                        <li
                          key={n.id}
                          className={`flex items-stretch ${
                            !n.is_read ? 'border-l-2 border-primary-fixed-dim bg-surface-container-low' : ''
                          }`}
                        >
                          <button
                            onClick={() => handleNotificationClick(n)}
                            className="flex-1 flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-container-high transition-colors"
                          >
                            <Icon
                              size={16}
                              className={`mt-0.5 flex-shrink-0 ${
                                !n.is_read ? 'text-primary-fixed-dim' : 'text-on-surface-variant'
                              }`}
                              aria-hidden
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className={`text-sm leading-snug truncate ${
                                  !n.is_read ? 'text-on-surface font-medium' : 'text-on-surface-variant'
                                }`}>
                                  {n.content}
                                </p>
                                {(n.count ?? 1) > 1 && (
                                  <span className="flex-shrink-0 rounded-full bg-primary-fixed-dim/20 px-1.5 py-0.5 text-[10px] font-bold text-primary-fixed-dim leading-none">
                                    {n.count}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-on-surface-variant mt-0.5">
                                {relativeTime(n.created_at)}
                              </p>
                            </div>
                          </button>
                          <button
                            onClick={() => handleDelete(n)}
                            className="flex-shrink-0 px-3 text-on-surface-variant/40 hover:text-error transition-colors"
                            aria-label="Benachrichtigung löschen"
                          >
                            <Trash2 size={14} aria-hidden />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {/* Footer */}
                <div className="border-t border-outline-variant px-4 py-2.5">
                  <Link
                    href="/notifications"
                    onClick={() => setOpen(false)}
                    className="block text-center text-xs font-medium text-primary-fixed-dim hover:opacity-75 transition-opacity"
                  >
                    Alle anzeigen
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/profile"
            aria-label="Profile"
            className="hidden md:inline-flex p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <User size={20} aria-hidden />
          </Link>

          <div
            className="h-8 w-8 rounded-full bg-surface-container-highest flex items-center justify-center"
            role="img"
            aria-label="User avatar"
          >
            <span className="text-xs text-on-surface-variant select-none">?</span>
          </div>
        </div>
      </nav>
    </header>
  )
}
