'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'

export default function SetupPage() {
  const router = useRouter()
  const { t } = useTranslation()

  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchApi<{ setupComplete: boolean }>('/setup/status')
      .then((data) => {
        if (data.setupComplete) {
          router.replace('/login')
        } else {
          setChecking(false)
        }
      })
      .catch(() => setChecking(false))
  }, [router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError(t.setup.errorTooShort)
      return
    }
    if (password !== passwordConfirm) {
      setError(t.setup.errorMismatch)
      return
    }

    setLoading(true)
    try {
      await fetchApi<{ message: string }>('/setup', {
        method: 'POST',
        body: JSON.stringify({ email, password, nickname }),
      })
      router.push('/login?setup=done')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.setup.errorFailed)
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full min-h-[52px] rounded-xl bg-surface-container px-4 py-3 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-fixed-dim border border-outline-variant'

  if (checking) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 text-on-surface-variant animate-spin" aria-hidden="true" />
      </div>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-on-surface mb-2 text-center">
        {t.setup.title}
      </h1>
      <p className="text-sm text-on-surface-variant text-center mb-8">
        {t.setup.subtitle}
      </p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="setup-email" className="text-sm font-medium text-on-surface-variant">
            {t.setup.email}
          </label>
          <input
            id="setup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder={t.support.emailPlaceholder}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="setup-nickname" className="text-sm font-medium text-on-surface-variant">
            {t.setup.nickname}
          </label>
          <input
            id="setup-nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            autoComplete="username"
            placeholder={t.setup.nicknamePlaceholder}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="setup-password" className="text-sm font-medium text-on-surface-variant">
            {t.setup.password}
          </label>
          <input
            id="setup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder={t.setup.passwordPlaceholder}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="setup-password-confirm" className="text-sm font-medium text-on-surface-variant">
            {t.setup.passwordConfirm}
          </label>
          <input
            id="setup-password-confirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="••••••••"
            className={inputClass}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[52px] mt-2 rounded-xl bg-primary-fixed-dim font-semibold text-on-primary-container transition-opacity disabled:opacity-60"
        >
          {loading ? t.setup.submitting : t.setup.submit}
        </button>
      </form>
    </>
  )
}
