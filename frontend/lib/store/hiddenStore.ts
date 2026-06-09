import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type HiddenTheme = 'brick' | 'neon'

interface HiddenState {
  isHidden: boolean
  clickCount: number
  theme: HiddenTheme
  showPWOverlay: boolean
  passwordAttempts: number
  hasEverBeenHidden: boolean
  incrementClick: () => void
  resetClickCount: () => void
  unlock: () => void
  lock: () => void
  toggleTheme: () => void
  openOverlay: () => void
  closeOverlay: () => void
  incrementPasswordAttempts: () => void
}

export const useHiddenStore = create<HiddenState>()(
  persist(
    (set, get) => ({
      isHidden: false,
      clickCount: 0,
      theme: 'brick',
      showPWOverlay: false,
      passwordAttempts: 0,
      hasEverBeenHidden: false,
      incrementClick: () => set({ clickCount: get().clickCount + 1 }),
      resetClickCount: () => set({ clickCount: 0 }),
      unlock: () => set({ isHidden: true, clickCount: 0, hasEverBeenHidden: true }),
      lock: () => set({ isHidden: false }),
      toggleTheme: () => set({ theme: get().theme === 'brick' ? 'neon' : 'brick' }),
      openOverlay: () => set({ showPWOverlay: true }),
      closeOverlay: () => set({ showPWOverlay: false, passwordAttempts: 0 }),
      incrementPasswordAttempts: () => set((s) => ({ passwordAttempts: s.passwordAttempts + 1 })),
    }),
    {
      name: 'xxx-hidden',
      partialize: (state) => ({ isHidden: state.isHidden, theme: state.theme, hasEverBeenHidden: state.hasEverBeenHidden }),
    }
  )
)
