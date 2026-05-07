'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChevronLeft, Send, User, Loader2, AlertCircle, Trash2 } from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import { connect, disconnect, getSocket } from '@/lib/socket'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  type: string
  is_deleted: boolean
  sent_at: string
  read_at: string | null
}

// Extends Message with local-only optimistic status
interface LocalMessage extends Message {
  _status?: 'pending' | 'error'
}

type MsgEnvelope = Message[] | { data: Message[] }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalise(res: MsgEnvelope): Message[] {
  return Array.isArray(res) ? res : (res?.data ?? [])
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()

  if (sameDay) {
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) +
    ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function shortId(id: string): string {
  return `Nutzer ${id.slice(0, 6).toUpperCase()}`
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isOwn,
  onLongPress,
  onContextMenu,
}: {
  msg: LocalMessage
  isOwn: boolean
  onLongPress: (id: string) => void
  onContextMenu: (e: React.MouseEvent, id: string) => void
}) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)

  function startPress() {
    didLongPress.current = false
    pressTimer.current = setTimeout(() => {
      didLongPress.current = true
      onLongPress(msg.id)
    }, 500)
  }

  function cancelPress() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  if (msg.is_deleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <p className="text-xs italic text-on-surface-variant px-3 py-2">
          Nachricht gelöscht
        </p>
      </div>
    )
  }

  return (
    <div
      className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
      onTouchStart={isOwn ? startPress : undefined}
      onTouchEnd={isOwn ? cancelPress : undefined}
      onTouchMove={isOwn ? cancelPress : undefined}
      onContextMenu={isOwn ? (e) => { e.preventDefault(); onContextMenu(e, msg.id) } : undefined}
    >
      {/* Avatar — only for other user */}
      {!isOwn && (
        <div
          className="flex-shrink-0 h-7 w-7 rounded-full bg-surface-container-high flex items-center justify-center mb-0.5"
          aria-hidden="true"
        >
          <User className="h-3.5 w-3.5 text-outline" />
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[75%] sm:max-w-[60%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 leading-relaxed text-sm break-words ${
            isOwn
              ? 'rounded-br-sm bg-surface-container text-on-surface'
              : 'rounded-bl-sm bg-primary-fixed-dim text-background'
          } ${msg._status === 'pending' ? 'opacity-60' : ''} ${msg._status === 'error' ? 'ring-1 ring-error' : ''}`}
        >
          {msg.content}
        </div>

        <div className={`flex items-center gap-1.5 px-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          <time className="text-[10px] text-on-surface-variant" dateTime={msg.sent_at}>
            {formatTime(msg.sent_at)}
          </time>
          {msg._status === 'pending' && (
            <Loader2 className="h-3 w-3 text-on-surface-variant animate-spin" aria-label="Wird gesendet" />
          )}
          {msg._status === 'error' && (
            <AlertCircle className="h-3 w-3 text-error" aria-label="Fehler beim Senden" />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConversationPage() {
  const params = useParams<{ id: string }>()
  const conversationId = params.id

  const currentUserId = useAuthStore((s) => (s.user as any)?.user_id ?? s.user?.id)

  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  // id of message currently showing the delete confirmation sheet
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const isFirstScroll = useRef(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [partnerNickname, setPartnerNickname] = useState<string | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingEmit = useRef(0)

  // ── Load messages ──────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const [msgRes, conv] = await Promise.all([
          fetchApi<MsgEnvelope>(`/chat/conversations/${conversationId}/messages`),
          fetchApi<{ user_a_id: string; user_b_id: string }>(`/chat/conversations/${conversationId}`),
        ])
        setMessages(normalise(msgRes))
        const myId = (useAuthStore.getState().user as any)?.user_id ?? useAuthStore.getState().user?.id
        const pid = conv.user_a_id === myId ? conv.user_b_id : conv.user_a_id
        fetchApi<{ nickname: string }>(`/profile/user/${pid}`)
          .then((p) => setPartnerNickname(p.nickname))
          .catch(() => { /* header falls back to shortId */ })
      } catch (err) {
        if (err instanceof Error && err.message === 'Session expired') return
        setError(err instanceof Error ? err.message : 'Fehler beim Laden')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [conversationId])

  // ── Socket ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const sock = connect()

    sock.emit('join_conversation', conversationId)
    sock.emit('read_messages', conversationId)

    sock.on('new_message', (msg: Message) => {
      if (msg.conversation_id !== conversationId) return
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      setPartnerTyping(false)
      const myId = (useAuthStore.getState().user as any)?.user_id ?? useAuthStore.getState().user?.id
      setMessages((prev) => {
        if (msg.sender_id === myId) {
          const pendingIdx = prev.findIndex((m) => m._status === 'pending')
          if (pendingIdx !== -1) {
            const next = [...prev]
            next[pendingIdx] = msg
            return next
          }
        }
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    })

    sock.on('user_typing', ({ userId, conversationId: cid }: { userId: string; conversationId: string }) => {
      const myId = (useAuthStore.getState().user as any)?.user_id ?? useAuthStore.getState().user?.id
      if (cid !== conversationId || userId === myId) return
      setPartnerTyping(true)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => setPartnerTyping(false), 3000)
    })

    return () => {
      sock.off('new_message')
      sock.off('user_typing')
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      disconnect()
    }
  }, [conversationId])

  // ── Auto-scroll ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (messages.length === 0) return
    bottomRef.current?.scrollIntoView({
      behavior: isFirstScroll.current ? 'instant' : 'smooth',
    })
    isFirstScroll.current = false
  }, [messages])

  // ── Send message ───────────────────────────────────────────────────────────

  function handleSend() {
    const content = input.trim()
    if (!content || sending) return

    const sock = getSocket()
    if (!sock?.connected) return

    const tempId = `temp-${Date.now()}`
    const optimistic: LocalMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId ?? '',
      content,
      type: 'text',
      is_deleted: false,
      sent_at: new Date().toISOString(),
      read_at: null,
      _status: 'pending',
    }

    setMessages((prev) => [...prev, optimistic])
    setInput('')
    setSending(true)
    sock.emit('send_message', { conversationId, content, type: 'text' })
    setSending(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
      return
    }
    const now = Date.now()
    if (now - lastTypingEmit.current > 2000) {
      lastTypingEmit.current = now
      getSocket()?.emit('typing', conversationId)
    }
  }

  // ── Delete message ─────────────────────────────────────────────────────────

  function openDeleteSheet(msgId: string) {
    // Only own, confirmed, non-deleted messages
    const msg = messages.find((m) => m.id === msgId)
    if (!msg || msg.is_deleted || msg._status) return
    setDeleteTargetId(msgId)
  }

  async function confirmDelete() {
    if (!deleteTargetId) return
    setDeleting(true)
    try {
      await fetchApi<unknown>(`/chat/messages/${deleteTargetId}`, { method: 'DELETE' })
      setMessages((prev) =>
        prev.map((m) =>
          m.id === deleteTargetId ? { ...m, is_deleted: true, content: '' } : m
        )
      )
    } catch {
      // leave message as-is; error is silent since the sheet closes either way
    } finally {
      setDeleting(false)
      setDeleteTargetId(null)
    }
  }

  // ── Partner ID ─────────────────────────────────────────────────────────────

  const partnerId =
    messages.find((m) => m.sender_id !== currentUserId)?.sender_id ?? null

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">

      {/* Conversation header — sticky below TopNav */}
      <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-sm border-b border-outline-variant px-4 py-3 flex items-center gap-3">
        <Link
          href="/chat"
          className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-surface-container transition-colors flex-shrink-0"
          aria-label="Zurück zur Nachrichtenliste"
        >
          <ChevronLeft className="h-5 w-5 text-on-surface" aria-hidden="true" />
        </Link>

        <div
          className="flex-shrink-0 h-9 w-9 rounded-full bg-surface-container-high flex items-center justify-center"
          aria-hidden="true"
        >
          <User className="h-5 w-5 text-outline" />
        </div>

        <div className="min-w-0">
          <p className="font-semibold text-on-surface text-sm truncate">
            {partnerNickname ?? (partnerId ? shortId(partnerId) : 'Gespräch')}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div
        className="px-4 py-4 space-y-3 pb-32 md:pb-24"
        role="log"
        aria-live="polite"
        aria-label="Nachrichten"
      >
        {(loading || currentUserId === undefined) ? (
          <div className="flex justify-center py-12" aria-busy="true">
            <Loader2 className="h-6 w-6 text-on-surface-variant animate-spin" aria-label="Lädt Nachrichten" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3" role="alert">
            <AlertCircle className="h-10 w-10 text-error" aria-hidden="true" />
            <p className="text-on-surface font-semibold">Fehler beim Laden</p>
            <p className="text-on-surface-variant text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-sm min-h-[44px] hover:opacity-90 transition-opacity"
            >
              Erneut versuchen
            </button>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-on-surface-variant text-sm py-12">
            Noch keine Nachrichten. Starte das Gespräch!
          </p>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isOwn={msg.sender_id === currentUserId}
              onLongPress={openDeleteSheet}
              onContextMenu={(_, id) => openDeleteSheet(id)}
            />
          ))
        )}
        {partnerTyping && (
          <div className="flex items-end gap-2 justify-start" aria-label="Tipp-Indikator">
            <div
              className="flex-shrink-0 h-7 w-7 rounded-full bg-surface-container-high flex items-center justify-center mb-0.5"
              aria-hidden="true"
            >
              <User className="h-3.5 w-3.5 text-outline" />
            </div>
            <div className="rounded-2xl rounded-bl-sm bg-primary-fixed-dim px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-background animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-background animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-background animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {/* Fixed input bar — above BottomNav on mobile */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-t border-outline-variant px-3 py-2.5">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nachricht schreiben…"
            className="flex-1 rounded-full bg-surface-container border border-outline-variant px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-fixed-dim min-h-[44px] transition-colors"
            aria-label="Nachricht eingeben"
            disabled={loading || !!error}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || loading || !!error}
            className="flex-shrink-0 h-11 w-11 rounded-full bg-primary-fixed-dim text-on-primary-container flex items-center justify-center hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            aria-label="Nachricht senden"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Delete confirmation bottom sheet */}
      {deleteTargetId && (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/50"
            onClick={() => !deleting && setDeleteTargetId(null)}
            aria-hidden="true"
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-30 rounded-t-2xl bg-surface-container-high border-t border-outline-variant p-6 space-y-4"
            role="dialog"
            aria-modal="true"
            aria-label="Nachricht löschen"
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-container">
                <Trash2 className="h-5 w-5 text-error" aria-hidden="true" />
              </div>
              <p className="font-semibold text-on-surface">Nachricht löschen?</p>
              <p className="text-sm text-on-surface-variant">
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-full bg-error-container text-error font-semibold text-sm min-h-[44px] hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
              >
                {deleting ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Löschen…
                  </span>
                ) : (
                  'Löschen'
                )}
              </button>
              <button
                onClick={() => setDeleteTargetId(null)}
                disabled={deleting}
                className="flex-1 py-3 rounded-full border border-outline-variant text-on-surface font-semibold text-sm min-h-[44px] hover:bg-surface-container active:scale-95 disabled:opacity-50 transition-all"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  )
}
