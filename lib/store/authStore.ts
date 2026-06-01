import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'user' | 'admin' | 'owner'

export interface User {
  id: string
  user_id?: string
  email: string
  role: Role
  is_banned?: boolean
  onboardingCompleted?: boolean
  [key: string]: unknown
}

export interface AuthState {
  accessToken: string | null
  user: User | null
  isBanned: boolean
  setAccessToken: (token: string) => void
  setUser: (user: User) => void
  setBanned: (val: boolean) => void
  logout: () => void
  clearAuth: () => void
}

function decodeJwtRole(token: string): Role {
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
      partialize: (state) => ({ accessToken: state.accessToken, user: state.user }),
    }
  )
)

export function selectUserRole(state: AuthState): Role | null
export function selectUserRole(): Role | null
export function selectUserRole(state?: AuthState): Role | null {
  const token = (state ?? useAuthStore.getState()).accessToken
  return token ? decodeJwtRole(token) : null
}

export function selectUserId(state: AuthState): string | null
export function selectUserId(): string | null
export function selectUserId(state?: AuthState): string | null {
  const token = (state ?? useAuthStore.getState()).accessToken
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return (payload.sub as string) ?? null
  } catch {
    return null
  }
}
