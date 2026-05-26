'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import { useTranslation } from '@/lib/i18n'

function getJwtRole(token: string | null): string | null {
  if (!token) return null
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const decoded = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string }
    return decoded.role ?? null
  } catch {
    return null
  }
}

interface AgbVersion {
  id: string
  type: 'agb' | 'privacy' | 'sensitive_data'
  version: string
  content_normal: string
}

export default function ConsentPage() {
  const router = useRouter()
  const { accessToken } = useAuthStore()
  const { t } = useTranslation()

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
      .catch(() => setError(t.consent.errorLoad))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const role = getJwtRole(accessToken)
      router.push(role === 'admin' || role === 'owner' ? '/dashboard' : '/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.consent.errorSave)
    } finally {
      setSubmitting(false)
    }
  }

  const labelText: Record<string, string> = {
    agb: t.consent.agb,
    privacy: t.consent.privacy,
    sensitive_data: t.consent.sensitiveData,
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
        {t.consent.loading}
      </div>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-on-surface mb-2 text-center">
        {t.consent.title}
      </h1>
      <p className="text-sm text-on-surface-variant text-center mb-8">
        {t.consent.subtitle}
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
              {t.consent.checkboxLabel.replace(
                '{label}',
                // render as text only — link is below
                labelText[v.type] ?? v.type
              ).split(labelText[v.type] ?? v.type)[0]}
              <Link
                href={linkPath[v.type] ?? '/agb'}
                target="_blank"
                className="text-primary-fixed-dim font-medium hover:underline"
              >
                {labelText[v.type] ?? v.type}
              </Link>
              {t.consent.checkboxLabel.replace(
                '{label}',
                labelText[v.type] ?? v.type
              ).split(labelText[v.type] ?? v.type)[1]}
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
          {submitting ? t.consent.submitting : t.consent.submit}
        </button>
      </form>
    </>
  )
}
