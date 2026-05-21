'use client'

import { useCallback } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { X } from 'lucide-react'
import { fetchApi } from '@/lib/api'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function StripeCheckoutModal({
  plan,
  onClose,
}: {
  plan: 'monthly' | 'yearly' | 'lifetime'
  onClose: () => void
}) {
  const fetchClientSecret = useCallback(async () => {
    const data = await fetchApi<{ clientSecret: string }>('/payment/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ plan, payment_method: 'card' }),
    })
    return data.clientSecret
  }, [plan])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-2xl bg-white overflow-y-auto max-h-[90vh] shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Schließen"
          className="absolute right-3 top-3 z-20 p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-gray-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  )
}
