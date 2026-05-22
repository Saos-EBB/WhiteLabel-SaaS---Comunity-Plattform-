import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  user_id?: string
  email: string
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isBanned: false,
      setAccessToken: (token) => set({ accessToken: token }),
      setUser: (user) => set({ user }),
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
