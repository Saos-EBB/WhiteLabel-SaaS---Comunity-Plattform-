'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Compass, MessageCircle, Users, Shield, Swords, Settings, User, Bell,
} from 'lucide-react'
import { useAuthStore, selectUserRole } from '@/lib/store/authStore'
import { useHiddenStore } from '@/lib/store/hiddenStore'
import { useNotificationStore } from '@/lib/store/notificationStore'
import { useTranslation } from '@/lib/i18n'
import { HiddenLogoButton, HiddenZoneControls } from './HiddenShortcut'
import { StatusPicker } from './StatusPicker'
import { AdminBadge } from './AdminBadge'

const ROUTE_TYPES: Record<string, string[]> = {
  '/chat':          ['message'],
  '/notifications': ['match', 'system', 'ban', 'beef_accepted', 'beef_won', 'beef_lost'],
  '/requests':      ['request'],
  '/beef':          ['beef_request'],
}

export function DesktopSidebar() {
  const pathname      = usePathname()
  const { t }         = useTranslation()
  const role          = useAuthStore(selectUserRole)
  const isAdmin       = role === 'admin' || role === 'owner'
  const isHidden      = useHiddenStore((s) => s.isHidden)
  const notifications = useNotificationStore((s) => s.notifications)

  function badgeCount(href: string): number {
    const types = ROUTE_TYPES[href]
    if (!types) return 0
    return notifications.filter((n) => !n.is_read && types.includes(n.type)).length
  }

  const mainLinks = [
    { href: '/dashboard',     label: t.nav.home,          Icon: LayoutDashboard },
    { href: '/notifications', label: t.nav.notifications, Icon: Bell },
    { href: '/discover',      label: t.nav.discover,       Icon: Compass },
    { href: '/chat',          label: t.nav.chat,           Icon: MessageCircle },
    ...(isAdmin
      ? [{ href: '/admin',    label: t.nav.admin,          Icon: Shield }]
      : [{ href: '/requests', label: t.nav.requests,       Icon: Users }]
    ),
    ...(isHidden ? [{ href: '/beef', label: 'Beef', Icon: Swords }] : []),
  ]

  const bottomLinks = [
    { href: '/settings', label: t.nav.settings, Icon: Settings },
    { href: '/profile',  label: t.nav.profile,  Icon: User },
  ]

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 h-screen sticky top-0 border-r border-outline-variant"
      style={{ background: 'var(--color-surface-container-lowest)' }}
    >
      {/* Logo row */}
      <div className="h-16 flex items-center px-5 border-b border-outline-variant shrink-0">
        <HiddenLogoButton />
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-3 flex flex-col gap-0.5 overflow-y-auto" aria-label="Desktop navigation">
        <div className="px-3 mb-1">
          <p className="text-[10px] uppercase tracking-widest font-semibold px-2 pb-1"
            style={{ color: 'var(--color-on-surface-variant)', opacity: 0.5 }}>
            Navigation
          </p>
        </div>
        {mainLinks.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const count  = badgeCount(href)
          return (
            <div key={href} className="px-3">
              <Link
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors w-full relative ${
                  active
                    ? 'text-primary-fixed-dim'
                    : 'text-on-surface-variant hover:text-on-surface'
                } ${count > 0 && !active ? 'nav-badge-glow' : ''}`}
                style={{
                  ...(active ? {
                    background: 'var(--color-surface-container)',
                    borderLeft: '2px solid var(--color-primary-fixed-dim)',
                    paddingLeft: '10px',
                  } : {}),
                  ...(count > 0 && !active ? {
                    boxShadow: '0 0 0 1px var(--color-nav-badge-glow)',
                  } : {}),
                }}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={17} aria-hidden strokeWidth={active ? 2.5 : 2} />
                <span className="flex-1">{label}</span>
                {count > 0 && (
                  <span
                    aria-label={`${count} ungelesen`}
                    className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none"
                    style={{
                      background: 'var(--color-nav-badge-glow)',
                      color: 'var(--color-surface-container-lowest)',
                    }}
                  >
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </Link>
            </div>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="shrink-0 border-t border-outline-variant">
        {/* Settings + Profile */}
        <div className="py-2 flex flex-col gap-0.5">
          {bottomLinks.map(({ href, label, Icon }) => {
            const active = pathname === href
            return (
              <div key={href} className="px-3">
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                    active ? 'text-primary-fixed-dim' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                  style={active ? { background: 'var(--color-surface-container)' } : {}}
                >
                  <Icon size={16} aria-hidden />
                  <span>{label}</span>
                </Link>
              </div>
            )
          })}
        </div>

        {/* Utility row: status + admin badge + hidden zone */}
        <div className="border-t border-outline-variant px-4 py-3 flex items-center gap-1 flex-wrap">
          <StatusPicker />
          {isAdmin && <AdminBadge />}
          <HiddenZoneControls />
        </div>
      </div>
    </aside>
  )
}
