'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Heart, MessageCircle, User, Shield } from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'

const navItems = [
  { href: '/dashboard', label: 'Home',           Icon: Home },
  { href: '/discover',  label: 'Discover',       Icon: Compass },
  { href: '/requests',  label: 'Requests',       Icon: Heart },
  { href: '/chat',      label: 'Chat',           Icon: MessageCircle },
  { href: '/profile',   label: 'Profile',        Icon: User },
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

export default function BottomNav() {
  const pathname = usePathname()
  const accessToken = useAuthStore((s) => s.accessToken)
  const isAdmin = getJwtRole(accessToken) === 'admin'
  const displayItems = isAdmin
    ? navItems.map((item) => item.href === '/requests' ? { href: '/admin', label: 'Admin', Icon: Shield } : item)
    : navItems

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-container-low/90 backdrop-blur-md rounded-t-2xl border-t border-outline-variant"
      aria-label="Bottom navigation"
    >
      <ul className="flex items-center justify-around h-16 px-1" role="list">
        {displayItems.map(({ href, label, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <li key={href}>
              <Link
                href={href}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors ${
                  isActive ? 'text-primary-fixed-dim' : 'text-on-surface-variant'
                }`}
              >
                <Icon size={22} fill={isActive ? 'currentColor' : 'none'} aria-hidden />
                <span className="text-[9px] font-medium">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
