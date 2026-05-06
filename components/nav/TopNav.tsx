'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sun } from 'lucide-react'

const navLinks = [
  { href: '/discover', label: 'Discover' },
  { href: '/requests', label: 'Requests' },
  { href: '/chat', label: 'Chat' },
]

export default function TopNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 bg-surface-container-low/80 backdrop-blur-md border-b border-outline-variant">
      <nav
        className="mx-auto flex h-16 max-w-screen-lg items-center px-4"
        aria-label="Main navigation"
      >
        <Link
          href="/"
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
