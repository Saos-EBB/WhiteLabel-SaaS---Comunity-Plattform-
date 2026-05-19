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
}

export const useConversationStore = create<ConversationState>()((set) => ({
  conversations: [],
  setConversations: (convs) => set({ conversations: convs }),
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
}))
