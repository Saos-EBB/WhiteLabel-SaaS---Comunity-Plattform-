'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Coins, Inbox, MessageCircle, Heart, Info, ShieldX, UserPlus, Trash2, User, Settings, Swords, Trophy } from 'lucide-react'
import { useEffect, useRef, useState, type ElementType } from 'react'
import {
  useNotificationStore,
  type Notification as AppNotification,
  type NotificationType,
} from '@/lib/store/notificationStore'
import { fetchApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import { useHiddenStore } from '@/lib/store/hiddenStore'
import { initLogoLetters, startShaking, triggerBreak } from '@/lib/physics/letterPhysics'
import { playHiddenAudio } from '@/lib/hiddenAudio'
import { OnlineIndicator } from '@/components/ui/OnlineIndicator'
import { useTranslation } from '@/lib/i18n'

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
  message:       MessageCircle,
  match:         Heart,
  system:        Info,
  ban:           ShieldX,
  request:       UserPlus,
  beef_request:  Swords,
  beef_accepted: Swords,
  beef_won:      Trophy,
  beef_lost:     Swords,
}

const TYPE_ROUTES: Record<NotificationType, string> = {
  message:       '/chat',
  match:         '/notifications',
  system:        '/notifications',
  ban:           '/notifications',
  request:       '/requests',
  beef_request:  '/beef',
  beef_accepted: '/beef',
  beef_won:      '/beef',
  beef_lost:     '/beef',
}

// ─── Status helpers ───────────────────────────────────────────────────────────

type StatusMessage = 'available' | 'looking_for_chat' | 'looking_for_date' | 'busy' | 'do_not_disturb' | null

// ─── relativeTime ─────────────────────────────────────────────────────────────

function relativeTime(
  dateString: string,
  rt: { justNow: string; minutesAgo: string; hoursAgo: string; daysAgo: string; daysAgoPlural: string }
): string {
  const diff = Date.now() - new Date(dateString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return rt.justNow
  if (mins < 60) return rt.minutesAgo.replace('{mins}', String(mins))
  const hours = Math.floor(mins / 60)
  if (hours < 24) return rt.hoursAgo.replace('{hours}', String(hours))
  const days = Math.floor(hours / 24)
  return (days === 1 ? rt.daysAgo : rt.daysAgoPlural).replace('{days}', String(days))
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
  const { t } = useTranslation()

  const accessToken = useAuthStore((s) => s.accessToken)
  const _role = getJwtRole(accessToken)
  const isAdmin = _role === 'admin' || _role === 'owner'
  const isHidden        = useHiddenStore((s) => s.isHidden)
  const theme           = useHiddenStore((s) => s.theme)
  const toggleTheme     = useHiddenStore((s) => s.toggleTheme)
  const clickCount      = useHiddenStore((s) => s.clickCount)
  const incrementClick  = useHiddenStore((s) => s.incrementClick)
  const resetClickCount = useHiddenStore((s) => s.resetClickCount)
  const openOverlay     = useHiddenStore((s) => s.openOverlay)

  const [coinBalance, setCoinBalance] = useState<number | null>(null)
  const [shopOpen, setShopOpen] = useState(false)

  const navLinks = [
    { href: '/dashboard', label: t.nav.home },
    { href: '/discover',  label: t.nav.discover },
    { href: '/requests',  label: t.nav.requests },
    { href: '/chat',      label: t.nav.chat },
  ]

  const STATUS_OPTIONS: { value: StatusMessage; label: string; color: string }[] = [
    { value: 'available',        label: t.status.available,      color: '#4ade80' },
    { value: 'looking_for_chat', label: t.status.lookingToTalk,  color: '#60a5fa' },
    { value: 'looking_for_date', label: t.status.lookingForDate, color: '#c084fc' },
    { value: 'busy',             label: t.status.busy,           color: '#f59e0b' },
    { value: 'do_not_disturb',   label: t.status.doNotDisturb,   color: '#f87171' },
  ]

  const baseNavLinks = isAdmin
    ? navLinks.map((l) => l.href === '/requests' ? { href: '/admin', label: t.nav.admin } : l)
    : navLinks
  const activeNavLinks = isHidden
    ? [...baseNavLinks, { href: '/beef', label: 'Beef 🥊' }]
    : baseNavLinks

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

  // ── Admin ticket badge ────────────────────────────────────────────────────
  const ticketCount = useNotificationStore((s) => s.adminTicketCount)

  const notifications = useNotificationStore((s) => s.notifications)
  const unreadCount   = useNotificationStore((s) => s.unreadCount)
  const displayUnread = pathname.startsWith('/chat/')
    ? notifications.filter((n) => !n.is_read && n.type !== 'message').length
    : unreadCount

  // ── Admin: load initial ticket count + live WebSocket updates ────────────

  useEffect(() => {
    if (!isAdmin) return

    async function loadCount() {
      try {
        const [reports, support] = await Promise.all([
          fetchApi<{ total: number }>('/admin/reports?status=open&limit=1&page=1'),
          fetchApi<{ total: number }>('/admin/tickets?status=open&limit=1&page=1'),
        ])
        useNotificationStore.getState().setAdminTicketCount((reports.total ?? 0) + (support.total ?? 0))
      } catch {
        // non-critical
      }
    }

    loadCount()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  // ── Load profile status on mount ──────────────────────────────────────────

  useEffect(() => {
    fetchApi<{ status_visible: boolean; status_message: StatusMessage }>(
      '/profile/me'
    ).then((p) => {
      setStatusVisible(p.status_visible)
      setStatusMessage(p.status_message)
    }).catch(() => {})
  }, [])

  // ── Load coin balance when hidden zone is active ──────────────────────────

  useEffect(() => {
    if (!isHidden) { setCoinBalance(null); return }

    function refresh() {
      fetchApi<number>('/hidden/coin/balance')
        .then((b) => { setCoinBalance(typeof b === 'number' ? b : 0) })
        .catch(() => { setCoinBalance(0) })
    }

    refresh()
    window.addEventListener('coin-balance-refresh', refresh)
    return () => window.removeEventListener('coin-balance-refresh', refresh)
  }, [isHidden])

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

  const logoResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoButtonRef     = useRef<HTMLButtonElement>(null)

  function handleLogoClick() {
    if (logoResetTimerRef.current) clearTimeout(logoResetTimerRef.current)
    incrementClick()
    if (clickCount + 1 >= 13) {
      const rect = logoButtonRef.current?.getBoundingClientRect()
      const text = logoButtonRef.current?.textContent ?? ''
      if (rect && text) {
        initLogoLetters(text, rect)
        startShaking()
        setTimeout(() => triggerBreak(), 700)
      }
      setTimeout(() => {
        playHiddenAudio()
        openOverlay()
      }, 900)
      resetClickCount()
    } else {
      logoResetTimerRef.current = setTimeout(() => {
        resetClickCount()
      }, 3000)
    }
  }

  return (
    <>
    <header className="sticky top-0 z-50 bg-surface-container-low/80 backdrop-blur-md border-b border-outline-variant">
      <nav
        className="mx-auto flex h-16 max-w-screen-lg items-center px-4"
        aria-label="Main navigation"
      >
        <button ref={logoButtonRef} onClick={handleLogoClick} className="text-xl font-bold text-on-surface tracking-tight" aria-label="Paarship home">
          XXX
        </button>

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

        {/* On mobile, flex-1 + justify-evenly spreads icons across the remaining width */}
        <div className="flex-1 sm:flex-none sm:ml-auto flex items-center justify-evenly sm:justify-start gap-0 sm:gap-2">

          {/* ── Status Dot ──────────────────────────────────────────────────── */}
          <div className="relative" ref={statusRef}>
            <button
              aria-label={t.status.label}
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
                aria-label={t.status.choose}
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
                  <span className="text-sm text-on-surface-variant">{t.status.invisible}</span>
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

          {/* ── Admin: Ticket inbox icon with live badge ─────────────────── */}
          {isAdmin ? (
            <Link
              href="/admin"
              aria-label={`Tickets${ticketCount > 0 ? `, ${ticketCount} offen` : ''}`}
              className="relative p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <Inbox size={20} aria-hidden />
              {ticketCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-on-error text-[10px] font-bold leading-none"
                >
                  {ticketCount > 9 ? '9+' : ticketCount}
                </span>
              )}
            </Link>
          ) : (
            /* ── Bell (regular users only) ──────────────────────────────── */
            <div className="relative" ref={bellRef}>
              <button
                aria-label={`${t.notifications.label}${displayUnread > 0 ? `, ${displayUnread} ungelesen` : ''}`}
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
                  aria-label={t.notifications.label}
                  className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-surface-container border border-outline-variant shadow-xl z-50 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
                    <span className="text-sm font-semibold text-on-surface">{t.notifications.label}</span>
                    {activeTab === 'neu' && unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-primary-fixed-dim hover:opacity-75 transition-opacity"
                      >
                        {t.notifications.markAllRead}
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
                          ? unreadCount > 0 ? `${t.notifications.tabNew} (${unreadCount})` : t.notifications.tabNew
                          : t.notifications.tabHistory}
                      </button>
                    ))}
                  </div>

                  {tabNotifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-on-surface-variant">
                      {activeTab === 'neu' ? t.notifications.emptyNew : t.notifications.emptyHistory}
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
                                  {relativeTime(n.created_at, t.relativeTime)}
                                </p>
                              </div>
                            </button>
                            <button
                              onClick={() => handleDelete(n)}
                              className="flex-shrink-0 px-3 text-on-surface-variant/40 hover:text-error transition-colors"
                              aria-label={t.notifications.deleteNotification}
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
                      {t.notifications.showAll}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          <Link
            href="/settings"
            aria-label={t.nav.settings}
            className="inline-flex p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <Settings size={20} aria-hidden />
          </Link>

          <Link
            href="/profile"
            aria-label={t.nav.profile}
            className="hidden md:inline-flex p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <User size={20} aria-hidden />
          </Link>

          {isHidden && coinBalance !== null && (
            <button
              onClick={() => setShopOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-surface-container-high border border-outline-variant hover:border-primary-fixed-dim transition-colors"
              title="Coins kaufen"
            >
              <Coins size={15} className="text-primary-fixed-dim" />
              <span className="text-sm font-bold text-on-surface tabular-nums">
                {coinBalance}
              </span>
            </button>
          )}

          {isHidden && (
            <button
              onClick={toggleTheme}
              title={theme === 'brick' ? 'Switch to Spielhölle' : 'Switch to Hinterhof'}
              className="h-8 w-8 rounded-full bg-surface-container-highest
                flex items-center justify-center text-base hover:scale-110
                transition-all border border-outline-variant"
            >
              {theme === 'brick' ? '🎰' : '🧱'}
            </button>
          )}
        </div>
      </nav>
    </header>

    {shopOpen && (
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) setShopOpen(false) }}
      >
        <div className="bg-surface-container border border-outline-variant rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-on-surface text-lg">🪙 Coins kaufen</h2>
            <button
              onClick={() => setShopOpen(false)}
              className="text-on-surface-variant hover:text-on-surface text-sm"
            >
              ✕
            </button>
          </div>
          {[
            { pkg: 'sardine',   label: '🐟 Sardine',   coins: '100',    price: '0,99 €'  },
            { pkg: 'thunfisch', label: '🐟 Thunfisch',  coins: '500',    price: '3,99 €'  },
            { pkg: 'hai',       label: '🦈 Hai',        coins: '2.000',  price: '12,99 €' },
            { pkg: 'moby_dick', label: '🐋 Moby Dick',  coins: '10.000', price: '49,99 €' },
          ].map(item => (
            <button
              key={item.pkg}
              onClick={async () => {
                setShopOpen(false)
                try {
                  const res = await fetchApi<{ url: string }>('/hidden/coin/purchase', {
                    method: 'POST',
                    body: JSON.stringify({ package: item.pkg }),
                  })
                  window.location.href = res.url
                } catch { alert('Fehler beim Öffnen des Shops') }
              }}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant hover:border-primary-fixed-dim transition-colors w-full text-left"
            >
              <div>
                <p className="font-semibold text-on-surface text-sm">{item.label}</p>
                <p className="text-xs text-primary-fixed-dim">{item.coins} Coins</p>
              </div>
              <span className="font-bold text-on-surface text-sm">{item.price}</span>
            </button>
          ))}
          <p className="text-xs text-on-surface-variant text-center">
            Stripe Test Mode — keine echten Zahlungen
          </p>
        </div>
      </div>
    )}
    </>
  )
}
