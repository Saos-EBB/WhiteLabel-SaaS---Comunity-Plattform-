'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronDown, Send, User, Loader2, AlertCircle, Trash2, MoreVertical, Flag, Ban } from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import { blurText } from '@/lib/profanity'
import { useNotificationStore } from '@/lib/store/notificationStore'
import { connect, getSocket } from '@/lib/socket'
import { OnlineIndicator } from '@/components/ui/OnlineIndicator'
import ReportModal from '@/components/ui/ReportModal'

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
  profanityFilter,
  onLongPress,
  onContextMenu,
}: {
  msg: LocalMessage
  isOwn: boolean
  profanityFilter: boolean
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
          {!isOwn && profanityFilter ? blurText(msg.content) : msg.content}
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
  const router = useRouter()

  const currentUserId   = useAuthStore((s) => (s.user as any)?.user_id ?? s.user?.id)
  const accessToken     = useAuthStore((s) => s.accessToken)
  const profanityFilter = useAuthStore((s) => (s.user as any)?.profanity_filter as boolean ?? true)

  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  // id of message currently showing the delete confirmation sheet
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // three-dot menu + chat-level actions
  const [menuOpen, setMenuOpen]             = useState(false)
  const [deleteChatOpen, setDeleteChatOpen] = useState(false)
  const [deletingChat, setDeletingChat]     = useState(false)
  const [reportOpen, setReportOpen]         = useState(false)
  const [partnerUserId, setPartnerUserId]   = useState<string | null>(null)

  // block state
  const [isBlocked, setIsBlocked]   = useState(false)
  const [blockedBy, setBlockedBy]   = useState<'me' | 'them' | null>(null)
  const [blockOpen, setBlockOpen]   = useState(false)
  const [blocking, setBlocking]     = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const isFirstScroll = useRef(true)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [partnerNickname, setPartnerNickname] = useState<string | null>(null)
  const [partnerIsOnline, setPartnerIsOnline] = useState(false)
  const [partnerStatusMessage, setPartnerStatusMessage] = useState<string | null>(null)
  // Ref so the socket closure always reads the current nickname without re-subscribing
  const partnerNicknameRef = useRef<string | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingEmit = useRef(0)

  // ── Active conversation tracking (suppresses bell notifications) ───────────

  useEffect(() => {
    const { setActiveConversationId, clearActiveConversationId } = useNotificationStore.getState()
    setActiveConversationId(conversationId)
    return () => { clearActiveConversationId() }
  }, [conversationId])

  // ── Load messages ──────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const [msgRes, conv] = await Promise.all([
          fetchApi<MsgEnvelope>(`/chat/conversations/${conversationId}/messages`),
          fetchApi<{ user_a_id: string; user_b_id: string; is_blocked: boolean; blocked_by: 'me' | 'them' | null }>(`/chat/conversations/${conversationId}`),
        ])
        setMessages(normalise(msgRes))
        setIsBlocked(conv.is_blocked)
        setBlockedBy(conv.blocked_by)
        const myId = (useAuthStore.getState().user as any)?.user_id ?? useAuthStore.getState().user?.id
        const pid = conv.user_a_id === myId ? conv.user_b_id : conv.user_a_id
        setPartnerUserId(pid)
        fetchApi<{ nickname: string }>(`/profile/user/${pid}`)
          .then(async (p) => {
            setPartnerNickname(p.nickname)
            partnerNicknameRef.current = p.nickname
            const pub = await fetchApi<{ is_online: boolean; status_message: string | null }>(
              `/profile/${encodeURIComponent(p.nickname)}`
            ).catch(() => null)
            if (pub) {
              setPartnerIsOnline(pub.is_online)
              setPartnerStatusMessage(pub.status_message ?? null)
            }
          })
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
    if (!accessToken) return

    const sock = connect()

    sock.emit('join_conversation', conversationId)
    sock.emit('read_messages', conversationId)

    function onNewMessage(msg: Message) {
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
    }

    function onUserTyping({ userId, conversationId: cid }: { userId: string; conversationId: string }) {
      const myId = (useAuthStore.getState().user as any)?.user_id ?? useAuthStore.getState().user?.id
      if (cid !== conversationId || userId === myId) return
      setPartnerTyping(true)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => setPartnerTyping(false), 3000)
    }

    sock.on('new_message', onNewMessage)
    sock.on('user_typing', onUserTyping)

    return () => {
      sock.off('new_message', onNewMessage)
      sock.off('user_typing', onUserTyping)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [conversationId, accessToken])

  // ── Scroll button visibility (IntersectionObserver on bottom sentinel) ─────

  useEffect(() => {
    const el = bottomRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowScrollBtn(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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

  // ── Delete chat ────────────────────────────────────────────────────────────

  async function handleDeleteChat() {
    setDeletingChat(true)
    try {
      await fetchApi<unknown>(`/chat/conversations/${conversationId}`, { method: 'DELETE' })
      router.replace('/chat')
    } catch {
      setDeletingChat(false)
      setDeleteChatOpen(false)
    }
  }

  // ── Block user ─────────────────────────────────────────────────────────────

  async function handleBlock() {
    if (!partnerUserId || blocking) return
    setBlocking(true)
    try {
      await fetchApi<unknown>(`/profile/me/block/${partnerUserId}`, { method: 'POST' })
      setBlockOpen(false)
      const conv = await fetchApi<{ user_a_id: string; user_b_id: string; is_blocked: boolean; blocked_by: 'me' | 'them' | null }>(
        `/chat/conversations/${conversationId}`
      )
      setIsBlocked(conv.is_blocked)
      setBlockedBy(conv.blocked_by)
    } catch {
      // silent — sheet stays open
    } finally {
      setBlocking(false)
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

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-on-surface text-sm truncate">
            {isBlocked ? 'XXXX' : partnerNickname ?? (partnerId ? shortId(partnerId) : 'Gespräch')}
          </p>
          <OnlineIndicator
            is_online={partnerIsOnline}
            status_message={partnerStatusMessage}
            size="sm"
          />
        </div>

        {/* Three-dot menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-surface-container transition-colors"
            aria-label="Mehr Optionen"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <MoreVertical className="h-5 w-5 text-on-surface" aria-hidden="true" />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div
                className="absolute right-0 top-10 z-20 min-w-[180px] rounded-xl bg-surface-container border border-outline-variant shadow-lg overflow-hidden"
                role="menu"
              >
                <button
                  onClick={() => { setMenuOpen(false); setDeleteChatOpen(true) }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-on-surface hover:bg-surface-container-high transition-colors text-left min-h-[44px]"
                  role="menuitem"
                >
                  <Trash2 className="h-4 w-4 text-error flex-shrink-0" aria-hidden="true" />
                  Chat löschen
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setReportOpen(true) }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-on-surface hover:bg-surface-container-high transition-colors text-left min-h-[44px]"
                  role="menuitem"
                >
                  <Flag className="h-4 w-4 text-on-surface-variant flex-shrink-0" aria-hidden="true" />
                  User melden
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setBlockOpen(true) }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-on-surface hover:bg-surface-container-high transition-colors text-left min-h-[44px]"
                  role="menuitem"
                >
                  <Ban className="h-4 w-4 text-error flex-shrink-0" aria-hidden="true" />
                  Nutzer blockieren
                </button>
              </div>
            </>
          )}
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
              profanityFilter={profanityFilter}
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
        <div className="h-6" aria-hidden="true" />
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollBtn && (
        <button
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="fixed bottom-36 md:bottom-20 right-4 z-10 h-10 w-10 rounded-full bg-surface-container-high border border-outline-variant shadow-md flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
          aria-label="Nach unten scrollen"
        >
          <ChevronDown className="h-5 w-5" aria-hidden="true" />
        </button>
      )}

      {/* Fixed input bar — above BottomNav on mobile */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-t border-outline-variant px-3 py-2.5">
        {isBlocked && (
          <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2 rounded-xl bg-error-container text-error px-4 py-2.5 text-sm" role="alert">
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {blockedBy === 'them'
              ? 'Dieser Nutzer hat dich blockiert.'
              : 'Du kannst diesem Nutzer keine Nachrichten senden.'}
          </div>
        )}
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
            disabled={loading || !!error || isBlocked}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || loading || !!error || isBlocked}
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

      {/* Delete chat confirmation bottom sheet */}
      {deleteChatOpen && (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/50"
            onClick={() => !deletingChat && setDeleteChatOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-30 rounded-t-2xl bg-surface-container-high border-t border-outline-variant p-6 space-y-4"
            role="dialog"
            aria-modal="true"
            aria-label="Chat löschen"
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-container">
                <Trash2 className="h-5 w-5 text-error" aria-hidden="true" />
              </div>
              <p className="font-semibold text-on-surface">Chat löschen?</p>
              <p className="text-sm text-on-surface-variant">
                Der Chat wird nur bei dir gelöscht. Die andere Person sieht ihn weiterhin.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <button
                onClick={handleDeleteChat}
                disabled={deletingChat}
                className="flex-1 py-3 rounded-full bg-error-container text-error font-semibold text-sm min-h-[44px] hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
              >
                {deletingChat ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Löschen…
                  </span>
                ) : (
                  'Löschen'
                )}
              </button>
              <button
                onClick={() => setDeleteChatOpen(false)}
                disabled={deletingChat}
                className="flex-1 py-3 rounded-full border border-outline-variant text-on-surface font-semibold text-sm min-h-[44px] hover:bg-surface-container active:scale-95 disabled:opacity-50 transition-all"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </>
      )}

      {/* Report modal */}
      {reportOpen && (
        <ReportModal
          reportedUserId={partnerUserId ?? undefined}
          onClose={() => setReportOpen(false)}
        />
      )}

      {/* Block user confirmation bottom sheet */}
      {blockOpen && (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/50"
            onClick={() => !blocking && setBlockOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-30 rounded-t-2xl bg-surface-container-high border-t border-outline-variant p-6 space-y-4"
            role="dialog"
            aria-modal="true"
            aria-label="Nutzer blockieren"
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-container">
                <Ban className="h-5 w-5 text-error" aria-hidden="true" />
              </div>
              <p className="font-semibold text-on-surface">Nutzer blockieren?</p>
              <p className="text-sm text-on-surface-variant">
                Der Nutzer wird aus deiner Suche entfernt. Du kannst ihm keine Nachrichten mehr senden. Diese Aktion kann rückgängig gemacht werden.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <button
                onClick={handleBlock}
                disabled={blocking}
                className="flex-1 py-3 rounded-full bg-error-container text-error font-semibold text-sm min-h-[44px] hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {blocking && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                Blockieren
              </button>
              <button
                onClick={() => setBlockOpen(false)}
                disabled={blocking}
                className="flex-1 py-3 rounded-full border border-outline-variant text-on-surface font-semibold text-sm min-h-[44px] hover:bg-surface-container active:scale-95 disabled:opacity-50 transition-all"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete message confirmation bottom sheet */}
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
