'use client'

import Link from 'next/link'
import { Inbox } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useNotificationStore } from '@/lib/store/notificationStore'
import { useAuthStore } from '@/lib/store/authStore'
import { fetchApi } from '@/lib/api'

export function AdminBadge() {
  const ticketCount = useNotificationStore((s) => s.adminTicketCount)
  const accessToken = useAuthStore((s) => s.accessToken)
  const hasFetched  = useRef(false)

  useEffect(() => {
    if (!accessToken || hasFetched.current) return
    hasFetched.current = true

    async function loadCount() {
      try {
        const [reports, support] = await Promise.all([
          fetchApi<{ total: number }>('/admin/reports?status=open&limit=1&page=1'),
          fetchApi<{ total: number }>('/admin/tickets?status=open&limit=1&page=1'),
        ])
        useNotificationStore.getState().setAdminTicketCount((reports.total ?? 0) + (support.total ?? 0))
      } catch {}
    }
    loadCount()
  }, [accessToken])

  return (
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
  )
}
