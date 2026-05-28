'use client'

import { useAuthStore } from '@/lib/store/authStore'
import { useBootstrap } from '@/hooks/useBootstrap'
import { useSocketEvents } from '@/hooks/useSocketEvents'
import { useHeartbeat } from '@/hooks/useHeartbeat'
import BanScreen from '@/components/ui/BanScreen'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const isBanned = useAuthStore((s) => s.isBanned)
  const { isReady } = useBootstrap()
  useSocketEvents(isReady)
  useHeartbeat(isReady)

  return (
    <>
      {isBanned && <BanScreen />}
      {children}
    </>
  )
}
