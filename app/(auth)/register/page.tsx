'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('http://localhost:3000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json() as { message?: string }

      if (!res.ok) {
        setError(data.message ?? 'Registrierung fehlgeschlagen')
        return
      }

      setSuccess(true)
    } catch {
      setError('Verbindungsfehler. Bitte versuche es erneut.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full min-h-[52px] rounded-xl bg-surface-container px-4 py-3 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-fixed-dim border border-outline-variant'

  if (success) {
    return (
      <div className="text-center">
        <div className="rounded-2xl bg-surface-container p-8">
          <p className="text-4xl mb-3" aria-hidden>✉️</p>
          <h2 className="text-xl font-bold text-on-surface mb-2">Fast geschafft!</h2>
          <p className="text-on-surface-variant text-sm">
            Bitte bestätige deine E-Mail
          </p>
        </div>
        <p className="mt-6 text-sm text-on-surface-variant">
          <Link href="/login" className="text-primary-fixed-dim font-medium hover:underline">
            Zurück zum Login
          </Link>
        </p>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-on-surface mb-8 text-center">
        Konto erstellen
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
          <label htmlFor="password" className="text-sm font-medium text-on-surface-variant">
            Passwort
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="••••••••"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm-password" className="text-sm font-medium text-on-surface-variant">
            Passwort bestätigen
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
          {loading ? 'Wird registriert…' : 'Registrieren'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-on-surface-variant">
        Bereits ein Konto?{' '}
        <Link href="/login" className="text-primary-fixed-dim font-medium hover:underline">
          Anmelden
        </Link>
      </p>
    </>
  )
}
