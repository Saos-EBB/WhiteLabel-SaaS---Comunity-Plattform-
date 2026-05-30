import { create } from 'zustand'

export interface Conversation {
  id: string
  user_a_id: string
  user_b_id: string
  status: string
  last_message_at: string | null
  last_message_content?: string | null
  last_message_sender_id?: string | null
  read_at?: string | null
  created_at: string
  partner_is_online?: boolean
  partner_status_visible?: boolean | null
  partner_status_message?: string | null
  partner_last_active_at?: string | null
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  type: string
  is_deleted: boolean
  sent_at: string
  read_at: string | null
  sender_nickname?: string
}

interface MessageUpdate {
  conversation_id: string
  content: string
  sender_id: string
  sent_at: string
}

interface ConversationState {
  conversations: Conversation[]
  setConversations: (convs: Conversation[]) => void
  applyMessage: (msg: MessageUpdate) => void
  markConversationRead: (conversationId: string) => void
  // Incoming socket messages for the open chat page to consume
  pendingMessages: Message[]
  pushPendingMessage: (msg: Message) => void
  clearPendingMessages: () => void
  // Partner typing indicator for the open chat page
  partnerTyping: boolean
  setPartnerTyping: (v: boolean) => void
}

export const useConversationStore = create<ConversationState>()((set) => ({
  conversations: [],
  setConversations: (convs) => set({ conversations: convs }),
  markConversationRead: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, read_at: new Date().toISOString() } : c
      ),
    })),
  applyMessage: (msg) =>
    set((state) => {
      const idx = state.conversations.findIndex((c) => c.id === msg.conversation_id)
      if (idx === -1) return state
      const updated: Conversation = {
        ...state.conversations[idx],
        last_message_content: msg.content,
        last_message_sender_id: msg.sender_id,
        last_message_at: msg.sent_at,
        read_at: null,
      }
      const rest = state.conversations.filter((_, i) => i !== idx)
      return { conversations: [updated, ...rest] }
    }),
  pendingMessages: [],
  pushPendingMessage: (msg) =>
    set((state) => ({ pendingMessages: [...state.pendingMessages, msg] })),
  clearPendingMessages: () => set({ pendingMessages: [] }),
  partnerTyping: false,
  setPartnerTyping: (v) => set({ partnerTyping: v }),
}))
