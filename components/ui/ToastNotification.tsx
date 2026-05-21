'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { useToastStore, type Toast } from '@/lib/store/toastStore'

const AUTO_DISMISS_MS = 5000

function ToastItem({ toast }: { toast: Toast }) {
  const router = useRouter()
  const removeToast = useToastStore((s) => s.removeToast)

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [toast.id, removeToast])

  function handleChatClick() {
    removeToast(toast.id)
    router.push(`/chat/${toast.conversationId}`)
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-3 rounded-2xl bg-surface-container border border-primary-fixed-dim shadow-lg p-4 w-80 max-w-[calc(100vw-2rem)]"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-on-surface leading-snug">
          <span className="font-semibold">{toast.nickname}</span> hat deine Anfrage angenommen
        </p>
        <button
          onClick={handleChatClick}
          className="mt-2 text-sm font-semibold text-primary-fixed-dim hover:opacity-80 transition-opacity"
        >
          Jetzt chatten →
        </button>
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        aria-label="Benachrichtigung schließen"
        className="flex-shrink-0 text-on-surface-variant hover:text-on-surface transition-colors mt-0.5"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

export default function ToastNotification() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div
      aria-label="Benachrichtigungen"
      className="fixed top-4 right-4 md:top-auto md:bottom-4 md:right-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
