'use client'

import { useAccessibilityStore } from '@/lib/store/accessibilityStore'
import TopNav from '@/components/nav/TopNav'
import BottomNav from '@/components/nav/BottomNav'
import AuthProvider from '@/components/AuthProvider'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const fontSizeClass = useAccessibilityStore((s) => s.fontSizeClass)
  const highContrast  = useAccessibilityStore((s) => s.highContrast)

  return (
    <AuthProvider>
      <div className={`${fontSizeClass}${highContrast ? ' high-contrast' : ''}`}>
        <TopNav />
        <main className="pb-16 md:pb-0">{children}</main>
        <BottomNav />
      </div>
    </AuthProvider>
  )
}
