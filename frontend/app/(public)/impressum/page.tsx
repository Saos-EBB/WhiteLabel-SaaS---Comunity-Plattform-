'use client'

import { useRouter } from 'next/navigation'
import { RaygunButton } from '@/components/RaygunButton'

export default function ImpressumPage() {
  const router = useRouter()

  return (
    <>
    <main className="min-h-screen bg-background pb-8">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          ← Zurück
        </button>

        <h1 className="text-2xl font-bold text-on-surface">Impressum</h1>

        <section className="space-y-1">
          <h2 className="text-sm font-semibold text-on-surface">
            Angaben gemäß § 5 ECG (AT) / § 5 TMG (DE)
          </h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            {process.env.NEXT_PUBLIC_COMPANY_NAME}<br />
            {process.env.NEXT_PUBLIC_COMPANY_STREET}<br />
            {process.env.NEXT_PUBLIC_COMPANY_CITY}, {process.env.NEXT_PUBLIC_COMPANY_COUNTRY}<br />
            E-Mail: {process.env.NEXT_PUBLIC_COMPANY_EMAIL}
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="text-sm font-semibold text-on-surface">Haftungsausschluss</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die
            Inhalte externer Links.
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="text-sm font-semibold text-on-surface">Urheberrecht</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Die durch den Betreiber erstellten Inhalte unterliegen dem österreichischen
            Urheberrecht.
          </p>
        </section>
      </div>
    </main>
    <RaygunButton />
    </>
  )
}
