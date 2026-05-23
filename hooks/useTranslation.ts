import { translations, type TranslationKeys, type Locale } from '@/config/translations'

// Returns the active locale's translations.
// Currently hardcoded to 'de' — swap the locale source to a LanguageContext
// or zustand store here when multi-locale support is needed.
export function useTranslation(): { t: TranslationKeys; locale: Locale } {
  const locale: Locale = 'de'
  return { t: translations[locale], locale }
}
