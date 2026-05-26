import { useLanguageStore } from '@/lib/store/languageStore'
import { de } from './de'
import { en } from './en'
import { fr } from './fr'
import { es } from './es'
import { it } from './it'
import { ru } from './ru'
import { ja } from './ja'
import { deEasy } from './de_easy'

export type { Translations as TranslationKeys } from './de'
export type { UiLang as Locale } from '@/lib/store/languageStore'

const translations = { de, en, fr, es, it, ru, ja, de_easy: deEasy }

export function useTranslation() {
  const uiLang = useLanguageStore((s) => s.uiLang)
  const t = translations[uiLang] ?? de
  return { t, locale: uiLang }
}
