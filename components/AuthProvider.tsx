'use client'

import { useAuthStore } from '@/lib/store/authStore'
import { useBootstrap } from '@/hooks/useBootstrap'
import { useSocketBus } from '@/hooks/useSocketBus'
import { useHeartbeat } from '@/hooks/useHeartbeat'
import BanScreen from '@/components/ui/BanScreen'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const isBanned = useAuthStore((s) => s.isBanned)
  const { isReady } = useBootstrap()
  useSocketBus(isReady)
  useHeartbeat(isReady)

  return (
    <>
      {isBanned && <BanScreen />}
      {children}
    </>
  )
}
