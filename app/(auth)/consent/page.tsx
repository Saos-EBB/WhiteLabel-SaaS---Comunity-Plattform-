'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchApi } from '@/lib/api'

interface AgbVersion {
  id: string
  type: 'agb' | 'privacy' | 'sensitive_data'
  version: string
  content_normal: string
}

export default function ConsentPage() {
  const router = useRouter()
  const [versions, setVersions] = useState<AgbVersion[]>([])
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchApi<AgbVersion[]>('/auth/agb-versions')
      .then((data) => {
        setVersions(data)
        const initial: Record<string, boolean> = {}
        data.forEach((v) => { initial[v.id] = false })
        setChecked(initial)
      })
      .catch(() => setError('Inhalte konnten nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [])

  const allChecked = versions.length > 0 && versions.every((v) => checked[v.id])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!allChecked) return
    setError(null)
    setSubmitting(true)
    try {
      await fetchApi('/auth/consent', {
        method: 'POST',
        body: JSON.stringify({
          consents: versions.map((v) => ({ agb_version_id: v.id, accepted: true })),
        }),
      })
      router.push('/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern der Zustimmung')
    } finally {
      setSubmitting(false)
    }
  }

  const labelText: Record<string, string> = {
    agb: 'AGB',
    privacy: 'Datenschutzerklärung',
    sensitive_data: 'Verarbeitung sensibler Daten',
  }

  const linkPath: Record<string, string> = {
    agb: '/agb',
    privacy: '/datenschutz',
    sensitive_data: '/datenschutz',
  }

  const inputClass =
    'h-5 w-5 rounded border-outline-variant accent-primary-fixed-dim cursor-pointer'

  if (loading) {
    return (
      <div className="text-center text-on-surface-variant text-sm py-8">
        Wird geladen…
      </div>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-on-surface mb-2 text-center">
        Zustimmung erforderlich
      </h1>
      <p className="text-sm text-on-surface-variant text-center mb-8">
        Bitte stimme den folgenden Bedingungen zu, um fortzufahren.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {versions.map((v) => (
          <label
            key={v.id}
            className="flex items-start gap-3 cursor-pointer"
          >
            <input
              type="checkbox"
              className={inputClass}
              checked={!!checked[v.id]}
              onChange={(e) =>
                setChecked((prev) => ({ ...prev, [v.id]: e.target.checked }))
              }
            />
            <span className="text-sm text-on-surface leading-snug">
              Ich stimme den{' '}
              <Link
                href={linkPath[v.type] ?? '/agb'}
                target="_blank"
                className="text-primary-fixed-dim font-medium hover:underline"
              >
                {labelText[v.type] ?? v.type}
              </Link>{' '}
              zu.
            </span>
          </label>
        ))}

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!allChecked || submitting}
          className="w-full min-h-[52px] mt-2 rounded-xl bg-primary-fixed-dim font-semibold text-on-primary-container transition-opacity disabled:opacity-60"
        >
          {submitting ? 'Wird gespeichert…' : 'Zustimmen & weiter'}
        </button>
      </form>
    </>
  )
}
