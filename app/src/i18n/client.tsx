'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { en } from './translations/en'
import { de } from './translations/de'
import { fr } from './translations/fr'
import type { Translations } from './translations/en'

export type Locale = 'en' | 'de' | 'fr'

const translations: Record<Locale, Translations> = { en, de, fr }

interface I18nContextValue {
  locale: Locale
  t: Translations
  setLocale: (l: Locale) => void
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  t: en,
  setLocale: () => {},
})

export function I18nProvider({ locale: initial, children }: { locale: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initial)

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    document.cookie = `knights_locale=${l};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`
  }, [])

  return (
    <I18nContext.Provider value={{ locale, t: translations[locale], setLocale }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}

export function useT() {
  return useContext(I18nContext).t
}
