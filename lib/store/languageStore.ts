import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UiLang = 'de' | 'en' | 'fr' | 'es' | 'it' | 'ru' | 'ja' | 'de_easy'

interface LanguageState {
  uiLang: UiLang
  setUiLang: (lang: UiLang) => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      uiLang: 'de',
      setUiLang: (lang) => set({ uiLang: lang }),
    }),
    { name: 'xxx-language' }
  )
)
