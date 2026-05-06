'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'

interface LoginResponse {
  accessToken: string
  user?: { id: string; email: string; [key: string]: unknown }
}

export default function LoginPage() {
  const router = useRouter()
  const { setAccessToken, setUser } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json() as LoginResponse & { message?: string }

      if (!res.ok) {
        setError(data.message ?? 'Anmeldung fehlgeschlagen')
        return
      }

      setAccessToken(data.accessToken)
      if (data.user) setUser(data.user)
      router.push('/dashboard')
    } catch {
      setError('Verbindungsfehler. Bitte versuche es erneut.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full min-h-[52px] rounded-xl bg-surface-container px-4 py-3 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-fixed-dim border border-outline-variant'

  return (
    <>
      <h1 className="text-2xl font-bold text-on-surface mb-8 text-center">
        Willkommen zurück
      </h1>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-on-surface-variant">
            E-Mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="name@beispiel.de"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-on-surface-variant">
              Passwort
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary-fixed-dim hover:underline"
            >
              Passwort vergessen?
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
          {loading ? 'Wird angemeldet…' : 'Anmelden'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-on-surface-variant">
        Noch kein Konto?{' '}
        <Link href="/register" className="text-primary-fixed-dim font-medium hover:underline">
          Registrieren
        </Link>
      </p>
    </>
  )
}
