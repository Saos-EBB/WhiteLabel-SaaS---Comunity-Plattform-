import Link from 'next/link'
import { Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-container-high">
            <Compass className="h-10 w-10 text-primary-fixed-dim" aria-hidden="true" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-on-surface">Seite nicht gefunden</h1>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            Die Seite, die du suchst, existiert nicht oder wurde verschoben.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-sm min-h-[44px] hover:opacity-90 active:scale-95 transition-all"
          >
            Zurück zur Startseite
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-outline-variant text-on-surface font-semibold text-sm min-h-[44px] hover:bg-surface-container active:scale-95 transition-all"
          >
            Entdecken
          </Link>
        </div>
      </div>
    </div>
  )
}
