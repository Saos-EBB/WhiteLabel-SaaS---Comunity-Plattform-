'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Compass,
  MessageCircle,
  UserPlus,
  Bell,
  Heart,
  UserCheck,
  ChevronRight,
} from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'

interface Profile {
  nickname: string
  photo_id: string | null
  onboarding_completed: boolean
  is_published: boolean
}

interface Notification {
  id: string
  type: string
  content: string
  is_read: boolean
  created_at: string
}

interface NotificationsResponse {
  data: Notification[]
}

function NotifIcon({ type }: { type: string }) {
  const cls = 'h-4 w-4 text-primary-fixed-dim'
  if (type === 'match') return <Heart className={cls} />
  if (type === 'message') return <MessageCircle className={cls} />
  if (type === 'request') return <UserPlus className={cls} />
  if (type === 'accepted') return <UserCheck className={cls} />
  return <Bell className={cls} />
}

function SkeletonPulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-container-high ${className}`} />
}

function LoadingSkeleton() {
  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 space-y-6">
      {/* Hero skeleton */}
      <div className="rounded-2xl bg-surface-container-low border border-outline-variant p-6 space-y-4">
        <div className="space-y-2">
          <SkeletonPulse className="h-7 w-72" />
          <SkeletonPulse className="h-4 w-52" />
        </div>
        <div className="flex gap-3">
          <SkeletonPulse className="h-11 w-44 rounded-full" />
          <SkeletonPulse className="h-11 w-36 rounded-full" />
        </div>
      </div>

      {/* Cards skeleton */}
      <div>
        <SkeletonPulse className="h-4 w-32 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl bg-surface-container border border-outline-variant p-5 space-y-3">
              <SkeletonPulse className="h-10 w-10 rounded-xl" />
              <div className="space-y-1.5">
                <SkeletonPulse className="h-4 w-28" />
                <SkeletonPulse className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

export default function DashboardPage() {
  const { t, locale } = useTranslation()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const secs = Math.floor(diff / 1000)
    const mins = Math.floor(secs / 60)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    if (secs < 60) return t.relativeTime.justNow
    if (mins < 60) return t.relativeTime.minutesAgo.replace('{mins}', String(mins))
    if (hours < 24) return t.relativeTime.hoursAgo.replace('{hours}', String(hours))
    if (days < 7) return (days === 1 ? t.relativeTime.daysAgo : t.relativeTime.daysAgoPlural).replace('{days}', String(days))
    return new Date(dateStr).toLocaleDateString(locale === 'en' ? 'en-GB' : 'de-DE')
  }

  useEffect(() => {
    async function load() {
      try {
        const [prof, notifs] = await Promise.all([
          fetchApi<Profile>('/profile/me'),
          fetchApi<NotificationsResponse>('/notifications'),
        ])
        setProfile(prof)
        setNotifications(notifs?.data ?? [])
      } catch (err) {
        if (err instanceof Error && err.message === 'Session expired') return
        setError(err instanceof Error ? err.message : t.dashboard.loadError)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <LoadingSkeleton />

  if (error) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-3" role="alert">
          <Bell className="h-12 w-12 text-error mx-auto" aria-hidden="true" />
          <p className="text-on-surface text-lg font-semibold">{t.dashboard.error}</p>
          <p className="text-on-surface-variant text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-6 py-2.5 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-sm min-h-[44px] hover:opacity-90 transition-opacity"
          >
            {t.common.retry}
          </button>
        </div>
      </main>
    )
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const recentNotifs = notifications.slice(0, 3)

  const unreadLabel = unreadCount > 0
    ? (unreadCount === 1
        ? t.dashboard.unreadOne.replace('{count}', String(unreadCount))
        : t.dashboard.unreadMany.replace('{count}', String(unreadCount)))
    : t.dashboard.noNotifications

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 space-y-6 pb-24 sm:pb-8">

      {/* Welcome Hero */}
      <section
        className="rounded-2xl bg-surface-container-low border border-outline-variant p-6 space-y-4"
        aria-label={t.dashboard.welcomeArea}
      >
        <div>
          <h1 className="text-2xl font-bold text-on-surface leading-tight">
            {t.dashboard.welcome.replace('{nickname}', profile?.nickname ?? '')}
          </h1>
          <p className="mt-1.5 text-sm text-on-surface-variant">
            {unreadLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-sm min-h-[44px] hover:opacity-90 active:scale-95 transition-all"
            aria-label={t.dashboard.discover}
          >
            <Compass className="h-4 w-4" aria-hidden="true" />
            {t.dashboard.discover}
          </Link>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-outline-variant text-on-surface font-semibold text-sm min-h-[44px] hover:bg-surface-container active:scale-95 transition-all"
            aria-label={unreadCount > 0 ? `${t.dashboard.messages}, ${unreadCount} ${t.dashboard.unreadAriaLabel}` : t.dashboard.messages}
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            {t.dashboard.messages}
            {unreadCount > 0 && (
              <span
                className="ml-0.5 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary-fixed-dim text-on-primary-container text-[10px] font-bold"
                aria-hidden="true"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </section>

      {/* Quick Action Cards */}
      <section aria-label={t.dashboard.quickAccess}>
        <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
          {t.dashboard.quickAccess}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <Link
            href="/discover"
            className="group rounded-2xl bg-surface-container border border-outline-variant p-5 flex flex-col gap-3 hover:bg-surface-container-high active:scale-[0.98] transition-all"
            aria-label={t.dashboard.discoverAriaLabel}
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-high group-hover:bg-surface-container-highest transition-colors">
                <Compass className="h-5 w-5 text-primary-fixed-dim" aria-hidden="true" />
              </div>
              <ChevronRight className="h-4 w-4 text-on-surface-variant translate-x-0 group-hover:translate-x-0.5 opacity-40 group-hover:opacity-100 transition-all mt-0.5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-on-surface text-sm">{t.dashboard.findPeople}</p>
              <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{t.dashboard.findPeopleDesc}</p>
            </div>
          </Link>

          <Link
            href="/chat"
            className="group rounded-2xl bg-surface-container border border-outline-variant p-5 flex flex-col gap-3 hover:bg-surface-container-high active:scale-[0.98] transition-all"
            aria-label={unreadCount > 0 ? `${t.dashboard.messages}, ${unreadCount} ${t.dashboard.unreadAriaLabel}` : t.dashboard.messages}
          >
            <div className="flex items-start justify-between">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-high group-hover:bg-surface-container-highest transition-colors">
                <MessageCircle className="h-5 w-5 text-primary-fixed-dim" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-primary-fixed-dim text-on-primary-container text-[10px] font-bold flex items-center justify-center"
                    aria-hidden="true"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-on-surface-variant translate-x-0 group-hover:translate-x-0.5 opacity-40 group-hover:opacity-100 transition-all mt-0.5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-on-surface text-sm">{t.dashboard.messages}</p>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary-fixed-dim text-on-primary-container text-[9px] font-bold" aria-hidden="true">
                    {unreadCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{t.dashboard.conversations}</p>
            </div>
          </Link>

          <Link
            href="/requests"
            className="group rounded-2xl bg-surface-container border border-outline-variant p-5 flex flex-col gap-3 hover:bg-surface-container-high active:scale-[0.98] transition-all"
            aria-label={t.dashboard.requestsAriaLabel}
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-high group-hover:bg-surface-container-highest transition-colors">
                <UserPlus className="h-5 w-5 text-primary-fixed-dim" aria-hidden="true" />
              </div>
              <ChevronRight className="h-4 w-4 text-on-surface-variant translate-x-0 group-hover:translate-x-0.5 opacity-40 group-hover:opacity-100 transition-all mt-0.5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-on-surface text-sm">{t.dashboard.requests}</p>
              <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{t.dashboard.requestsDesc}</p>
            </div>
          </Link>

        </div>
      </section>

      {/* Recent Notifications */}
      {recentNotifs.length > 0 && (
        <section aria-label={t.dashboard.recentNotificationsArea}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              {t.dashboard.recentNotifications}
            </h2>
            <Link
              href="/notifications"
              className="text-sm text-primary-fixed-dim font-medium hover:opacity-80 transition-opacity min-h-[44px] flex items-center"
              aria-label={t.notifications.showAll}
            >
              {t.notifications.showAll}
            </Link>
          </div>
          <ul className="space-y-2" role="list" aria-label={t.dashboard.notificationList}>
            {recentNotifs.map((notif) => (
              <li
                key={notif.id}
                className={`flex items-start gap-3 rounded-xl p-4 border transition-colors ${
                  notif.is_read
                    ? 'bg-surface-container border-outline-variant'
                    : 'bg-surface-container-high border-primary-fixed-dim/20'
                }`}
              >
                <div
                  className="flex-shrink-0 mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-highest"
                  aria-hidden="true"
                >
                  <NotifIcon type={notif.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-on-surface leading-snug">{notif.content}</p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    <time dateTime={notif.created_at}>{relativeTime(notif.created_at)}</time>
                  </p>
                </div>
                {!notif.is_read && (
                  <div
                    className="flex-shrink-0 mt-2 h-2 w-2 rounded-full bg-primary-fixed-dim"
                    role="status"
                    aria-label={t.dashboard.unreadAriaLabel}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

    </main>
  )
}
