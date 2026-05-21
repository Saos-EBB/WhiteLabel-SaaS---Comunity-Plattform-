'use client'

import { useRouter } from 'next/navigation'

export default function DatenschutzPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-background pb-8">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          ← Zurück
        </button>

        <h1 className="text-2xl font-bold text-on-surface">Datenschutzerklärung</h1>

        <section className="space-y-1">
          <h2 className="text-sm font-semibold text-on-surface">Verantwortlicher</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            {process.env.NEXT_PUBLIC_COMPANY_NAME}, {process.env.NEXT_PUBLIC_COMPANY_STREET}, {process.env.NEXT_PUBLIC_COMPANY_CITY}<br />
            {process.env.NEXT_PUBLIC_COMPANY_EMAIL}
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="text-sm font-semibold text-on-surface">Erhobene Daten</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            E-Mail, Nickname, Geburtsdatum, Stadt, Interessen
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="text-sm font-semibold text-on-surface">Zweck</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Betrieb der Plattform, Matching, Kommunikation
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="text-sm font-semibold text-on-surface">Rechtsgrundlage</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Art. 6 Abs. 1 lit. b DSGVO
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="text-sm font-semibold text-on-surface">Speicherdauer</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Bis zur Kontolöschung, danach Pseudonymisierung nach 30 Tagen (Art. 17 DSGVO)
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="text-sm font-semibold text-on-surface">Rechte der betroffenen Person</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit
            (Art. 15–20 DSGVO)
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="text-sm font-semibold text-on-surface">Kontakt bei Datenschutzfragen</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            {process.env.NEXT_PUBLIC_COMPANY_EMAIL}
          </p>
        </section>
      </div>
    </main>
  )
}
