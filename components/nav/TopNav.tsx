'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, MessageCircle, Heart, Info, ShieldX, UserPlus, Trash2, User, Settings } from 'lucide-react'
import { useEffect, useRef, useState, type ElementType } from 'react'
import {
  useNotificationStore,
  type Notification as AppNotification,
  type NotificationType,
} from '@/lib/store/notificationStore'
import { fetchApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import { OnlineIndicator } from '@/components/ui/OnlineIndicator'

const navLinks = [
  { href: '/discover', label: 'Discover' },
  { href: '/requests', label: 'Requests' },
  { href: '/chat', label: 'Chat' },
]

function getJwtRole(token: string | null): string | null {
  if (!token) return null
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const decoded = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string }
    return decoded.role ?? null
  } catch {
    return null
  }
}

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

// ─── Status helpers ───────────────────────────────────────────────────────────

type StatusMessage = 'available' | 'looking_for_chat' | 'looking_for_date' | 'busy' | 'do_not_disturb' | null

const STATUS_OPTIONS: { value: StatusMessage; label: string; color: string }[] = [
  { value: 'available',        label: 'Verfügbar',      color: '#4ade80' },
  { value: 'looking_for_chat', label: 'Suche Gespräch', color: '#60a5fa' },
  { value: 'looking_for_date', label: 'Suche Date',     color: '#c084fc' },
  { value: 'busy',             label: 'Beschäftigt',    color: '#f59e0b' },
  { value: 'do_not_disturb',   label: 'Nicht stören',   color: '#f87171' },
]

// ─── relativeTime ─────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()

  const accessToken = useAuthStore((s) => s.accessToken)
  const isAdmin = getJwtRole(accessToken) === 'admin'
  const activeNavLinks = isAdmin
    ? navLinks.map((l) => l.href === '/requests' ? { href: '/admin', label: 'Admin' } : l)
    : navLinks

  // Bell dropdown
  const [bellOpen, setBellOpen]     = useState(false)
  const [activeTab, setActiveTab]   = useState<'neu' | 'verlauf'>('neu')
  const bellRef                     = useRef<HTMLDivElement>(null)

  // Status dropdown
  const [statusOpen, setStatusOpen]       = useState(false)
  const [statusVisible, setStatusVisible] = useState(true)
  const [statusMessage, setStatusMessage] = useState<StatusMessage>(null)
  const [statusSaving, setStatusSaving]   = useState(false)
  const statusRef                         = useRef<HTMLDivElement>(null)

  const seenRequestIdsRef    = useRef(new Set<string>())
  const isFirstRequestPollRef = useRef(true)

  const notifications = useNotificationStore((s) => s.notifications)
  const unreadCount   = useNotificationStore((s) => s.unreadCount)
  const displayUnread = pathname.startsWith('/chat/')
    ? notifications.filter((n) => !n.is_read && n.type !== 'message').length
    : unreadCount

  // ── Load profile status on mount ──────────────────────────────────────────

  useEffect(() => {
    fetchApi<{ status_visible: boolean; status_message: StatusMessage }>(
      '/profile/me'
    ).then((p) => {
      setStatusVisible(p.status_visible)
      setStatusMessage(p.status_message)
    }).catch(() => {})
  }, [])

  // ── Poll notifications + pending requests ─────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchApi<AppNotification[]>('/notifications')
        useNotificationStore.getState().setNotifications(data)
      } catch {
        // non-critical
      }

      try {
        const res = await fetchApi<IncomingEnvelope>('/chat/requests/incoming')
        const pending = normaliseRequests(res).filter((r) => r.status === 'pending')
        pending.forEach((r) => seenRequestIdsRef.current.add(r.id))
      } catch {
        // non-critical
      }
    }

    load()
  }, [])

  // ── Close bell on outside click ───────────────────────────────────────────

  useEffect(() => {
    if (!bellOpen) return
    function onOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [bellOpen])

  // ── Close status on outside click ─────────────────────────────────────────

  useEffect(() => {
    if (!statusOpen) return
    function onOutside(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [statusOpen])

  // ── Notification handlers ─────────────────────────────────────────────────

  function handleNotificationClick(n: AppNotification) {
    setBellOpen(false)
    if (!n.is_read) {
      useNotificationStore.getState().markRead(n.id)
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

  // ── Status handlers ───────────────────────────────────────────────────────

  async function handleSetStatus(value: StatusMessage) {
    if (statusSaving) return
    setStatusMessage(value)
    setStatusSaving(true)
    try {
      await fetchApi('/profile/me', {
        method: 'PUT',
        body: JSON.stringify({ status_message: value }),
      })
    } catch {
      // optimistic — ignore error silently
    } finally {
      setStatusSaving(false)
    }
    setStatusOpen(false)
  }

  async function handleToggleVisible() {
    if (statusSaving) return
    const next = !statusVisible
    setStatusVisible(next)
    setStatusSaving(true)
    try {
      await fetchApi('/profile/me', {
        method: 'PUT',
        body: JSON.stringify({ status_visible: next }),
      })
    } catch {
      setStatusVisible(!next) // revert
    } finally {
      setStatusSaving(false)
    }
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
          {activeNavLinks.map(({ href, label }) => {
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

          {/* ── Status Dot ──────────────────────────────────────────────────── */}
          <div className="relative" ref={statusRef}>
            <button
              aria-label="Online-Status ändern"
              aria-expanded={statusOpen}
              onClick={() => setStatusOpen((v) => !v)}
              className="p-2 rounded-lg hover:bg-surface-container transition-colors flex items-center justify-center"
            >
              <span className="pointer-events-none [&>span>span:last-child]:hidden">
                <OnlineIndicator
                  is_online={!!accessToken}
                  status_message={statusMessage}
                  size="sm"
                />
              </span>
            </button>

            {statusOpen && (
              <div
                role="dialog"
                aria-label="Status wählen"
                className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-surface-container border border-outline-variant shadow-xl z-50 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-outline-variant">
                  <span className="text-sm font-semibold text-on-surface">Status</span>
                </div>

                <ul>
                  {STATUS_OPTIONS.map(({ value, label, color }) => (
                    <li key={value ?? 'none'}>
                      <button
                        onClick={() => handleSetStatus(value)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-surface-container-high ${
                          statusMessage === value ? 'text-on-surface font-medium' : 'text-on-surface-variant'
                        }`}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                          aria-hidden="true"
                        />
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-outline-variant px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-on-surface-variant">Unsichtbar</span>
                  <button
                    role="switch"
                    aria-checked={!statusVisible}
                    onClick={handleToggleVisible}
                    disabled={statusSaving}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${
                      !statusVisible ? 'bg-primary-fixed-dim' : 'bg-surface-container-high'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition duration-200 ${
                        !statusVisible ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Bell ────────────────────────────────────────────────────────── */}
          <div className="relative" ref={bellRef}>
            <button
              aria-label={`Benachrichtigungen${displayUnread > 0 ? `, ${displayUnread} ungelesen` : ''}`}
              aria-expanded={bellOpen}
              onClick={() => setBellOpen((v) => !v)}
              className={`relative p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors ${
                displayUnread > 0 ? 'animate-pulse ring-2 ring-offset-1 ring-[#73db9a]' : ''
              }`}
            >
              <Bell size={20} aria-hidden />
              {displayUnread > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-on-error text-[10px] font-bold leading-none"
                >
                  {displayUnread > 9 ? '9+' : displayUnread}
                </span>
              )}
            </button>

            {bellOpen && (
              <div
                role="dialog"
                aria-label="Benachrichtigungen"
                className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-surface-container border border-outline-variant shadow-xl z-50 overflow-hidden"
              >
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
                              <p className={`text-sm leading-snug truncate ${
                                !n.is_read ? 'text-on-surface font-medium' : 'text-on-surface-variant'
                              }`}>
                                {n.content}
                              </p>
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

                <div className="border-t border-outline-variant px-4 py-2.5">
                  <Link
                    href="/notifications"
                    onClick={() => setBellOpen(false)}
                    className="block text-center text-xs font-medium text-primary-fixed-dim hover:opacity-75 transition-opacity"
                  >
                    Alle anzeigen
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/settings"
            aria-label="Einstellungen"
            className="inline-flex p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <Settings size={20} aria-hidden />
          </Link>

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
