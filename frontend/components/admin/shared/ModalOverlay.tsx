import { X } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

export function ModalOverlay({
  title, onClose, children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="fixed bottom-16 left-0 right-0 z-50 rounded-t-2xl bg-surface-container-high border-t border-outline-variant p-6 space-y-4 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:max-w-lg md:w-full"
      >
        <div className="flex items-center justify-between">
          <p id="modal-title" className="font-semibold text-on-surface">{title}</p>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container"
            aria-label={t.common.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </>
  )
}
