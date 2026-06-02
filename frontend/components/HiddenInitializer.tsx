'use client'

import { useHiddenZone } from '@/hooks/useHiddenZone'

export function HiddenInitializer() {
  useHiddenZone()
  return null
}
