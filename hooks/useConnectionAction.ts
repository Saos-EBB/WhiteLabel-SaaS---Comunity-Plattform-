'use client'

import { useState, useEffect } from 'react'
import { fetchApi } from '@/lib/api'

export type ConnectionStatus = 'NONE' | 'SENT' | 'RECEIVED' | 'CONNECTED' | 'BLOCKED'

export interface UseConnectionActionReturn {
  connectionStatus: ConnectionStatus
  conversationId: string | null
  sendRequest: () => Promise<boolean>
  acceptRequest: () => Promise<string | null>
  declineRequest: () => Promise<boolean>
  disconnect: () => Promise<boolean>
  block: () => Promise<boolean>
  unblock: () => Promise<boolean>
  isLoading: boolean
  error: string | null
  clearError: () => void
}

export function useConnectionAction(
  targetUserId: string,
  initialStatus: ConnectionStatus = 'NONE',
  initialRequestId: string | null = null,
  initialConversationId: string | null = null,
): UseConnectionActionReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(initialStatus)
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId)
  const [requestId, setRequestId] = useState<string | null>(initialRequestId)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync once when targetUserId transitions from '' (profile not yet loaded)
  // to a real value. useState only captures the initial render's values, so
  // without this the hook would stay at 'NONE' until the user takes an action.
  useEffect(() => {
    if (!targetUserId) return
    setConnectionStatus(initialStatus)
    setConversationId(initialConversationId)
    setRequestId(initialRequestId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId])

  async function sendRequest(): Promise<boolean> {
    setIsLoading(true)
    setError(null)
    try {
      await fetchApi<unknown>('/chat/requests', {
        method: 'POST',
        body: JSON.stringify({ receiver_id: targetUserId }),
      })
      setConnectionStatus('SENT')
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anfrage fehlgeschlagen')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Returns the new conversationId on success, null on failure.
  async function acceptRequest(): Promise<string | null> {
    if (!requestId) return null
    setIsLoading(true)
    setError(null)
    try {
      const conv = await fetchApi<{ id: string }>(`/chat/requests/${requestId}/accept`, {
        method: 'PATCH',
      })
      setConnectionStatus('CONNECTED')
      setConversationId(conv.id)
      setRequestId(null)
      return conv.id
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Annehmen')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  async function declineRequest(): Promise<boolean> {
    if (!requestId) return false
    setIsLoading(true)
    setError(null)
    try {
      await fetchApi<unknown>(`/chat/requests/${requestId}/decline`, {
        method: 'PATCH',
      })
      setConnectionStatus('NONE')
      setRequestId(null)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Ablehnen')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  async function disconnect(): Promise<boolean> {
    setIsLoading(true)
    setError(null)
    try {
      await fetchApi<unknown>(`/chat/connections/${targetUserId}`, { method: 'DELETE' })
      setConnectionStatus('NONE')
      setConversationId(null)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Trennen')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  async function block(): Promise<boolean> {
    setIsLoading(true)
    setError(null)
    try {
      await fetchApi<unknown>(`/profile/me/block/${targetUserId}`, { method: 'POST' })
      setConnectionStatus('BLOCKED')
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Blockieren')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  async function unblock(): Promise<boolean> {
    setIsLoading(true)
    setError(null)
    try {
      await fetchApi<unknown>(`/profile/me/block/${targetUserId}`, { method: 'DELETE' })
      setConnectionStatus('NONE')
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Entblocken')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    connectionStatus,
    conversationId,
    sendRequest,
    acceptRequest,
    declineRequest,
    disconnect,
    block,
    unblock,
    isLoading,
    error,
    clearError: () => setError(null),
  }
}
