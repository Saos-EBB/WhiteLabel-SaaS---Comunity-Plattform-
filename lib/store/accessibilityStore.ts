import { create } from 'zustand'

interface AccessibilityState {
  fontSizeClass: string
  highContrast: boolean
  langSimple: boolean
  applySettings: (profile: {
    font_size?: unknown
    high_contrast?: unknown
    lang_simple?: unknown
  }) => void
}

export const useAccessibilityStore = create<AccessibilityState>((set) => ({
  fontSizeClass: 'text-base',
  highContrast: false,
  langSimple: false,
  applySettings: ({ font_size, high_contrast, lang_simple }) =>
    set({
      fontSizeClass:
        font_size === 'large' ? 'text-lg'
        : font_size === 'xl'  ? 'text-xl'
        : 'text-base',
      highContrast: !!high_contrast,
      langSimple:   !!lang_simple,
    }),
}))
