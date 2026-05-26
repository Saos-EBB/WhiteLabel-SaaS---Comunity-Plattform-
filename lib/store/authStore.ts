import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  user_id?: string
  email: string
  role: 'user' | 'admin' | 'owner'
  is_banned?: boolean
  [key: string]: unknown
}

interface AuthState {
  accessToken: string | null
  user: User | null
  isBanned: boolean
  setAccessToken: (token: string) => void
  setUser: (user: User) => void
  setBanned: (val: boolean) => void
  logout: () => void
  clearAuth: () => void
}

function decodeJwtRole(token: string): 'user' | 'admin' | 'owner' {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.role === 'admin' || payload.role === 'owner') return payload.role
  } catch { /* ignore */ }
  return 'user'
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      isBanned: false,
      setAccessToken: (token) => set({ accessToken: token }),
      setUser: (user) => {
        const role = get().accessToken ? decodeJwtRole(get().accessToken!) : 'user'
        set({ user: { ...user, role } })
      },
      setBanned: (val) => set({ isBanned: val }),
      logout: () => {
        set({ accessToken: null, user: null, isBanned: false })
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      },
      clearAuth: () => set({ accessToken: null, user: null }),
    }),
    {
      name: 'xxx-auth',
      partialize: (state) => ({ accessToken: state.accessToken }),
    }
  )
)
