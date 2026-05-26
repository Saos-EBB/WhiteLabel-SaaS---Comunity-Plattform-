import { AlertTriangle } from 'lucide-react'

interface ErrorCardProps {
  title: string
  message: string
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorCard({ title, message, onRetry, retryLabel = 'Erneut versuchen' }: ErrorCardProps) {
  return (
    <div className="rounded-2xl bg-surface-container border border-outline-variant p-5 flex flex-col items-center text-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-high">
        <AlertTriangle className="h-5 w-5 text-error" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-on-surface text-sm">{title}</p>
        <p className="text-xs text-on-surface-variant leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-sm min-h-[36px] hover:opacity-90 active:scale-95 transition-all"
        >
          {retryLabel}
        </button>
      )}
    </div>
  )
}
