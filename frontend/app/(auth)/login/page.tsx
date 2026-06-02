'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { fetchApi } from '@/lib/api'
import ContactSupportModal from '@/components/ui/ContactSupportModal'
import { useTranslation } from '@/lib/i18n'

interface LoginResponse {
  accessToken: string
  needsConsent: boolean
  user?: { id: string; email: string; role: 'user' | 'admin' | 'owner'; [key: string]: unknown }
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setAccessToken, setUser } = useAuthStore()
  const { t } = useTranslation()

  const setupDone = searchParams.get('setup') === 'done'

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const data = await fetchApi<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      })

      setAccessToken(data.accessToken)
      if (data.user) setUser(data.user)
      router.push(data.needsConsent ? '/consent' : '/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.login.failed)
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full min-h-[52px] rounded-xl bg-surface-container px-4 py-3 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-fixed-dim border border-outline-variant'

  return (
    <>
      {setupDone && (
        <div
          role="status"
          className="mb-6 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 text-center"
        >
          {t.login.setupDone}
        </div>
      )}

      <h1 className="text-2xl font-bold text-on-surface mb-8 text-center">
        {t.login.title}
      </h1>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="identifier" className="text-sm font-medium text-on-surface-variant">
            {t.login.emailOrNickname}
          </label>
          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
            placeholder={t.login.emailOrNicknamePlaceholder}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-on-surface-variant">
              {t.login.password}
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary-fixed-dim hover:underline"
            >
              {t.login.forgotPassword}
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
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
          {loading ? t.login.submitting : t.login.submit}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-on-surface-variant">
        {t.login.noAccount}{' '}
        <Link href="/register" className="text-primary-fixed-dim font-medium hover:underline">
          {t.login.register}
        </Link>
      </p>

      <p className="mt-3 text-center text-xs text-on-surface-variant">
        <button
          type="button"
          onClick={() => setShowSupportModal(true)}
          className="hover:text-on-surface transition-colors"
        >
          {t.login.helpAndSupport}
        </button>
      </p>

      {showSupportModal && (
        <ContactSupportModal onClose={() => setShowSupportModal(false)} />
      )}
    </>
  )
}
