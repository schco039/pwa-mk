import { cookies } from 'next/headers'
import { en } from './translations/en'
import { de } from './translations/de'
import { fr } from './translations/fr'
import type { Translations } from './translations/en'

export type Locale = 'en' | 'de' | 'fr'
export type { Translations }

export const locales: Record<Locale, Translations> = { en, de, fr }
export const localeLabels: Record<Locale, string> = { en: 'EN', de: 'DE', fr: 'FR' }

/** Read locale from cookie (server-side) */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const val = cookieStore.get('knights_locale')?.value
  if (val === 'de' || val === 'fr') return val
  return 'en'
}

/** Get translations for a locale */
export function getT(locale: Locale) {
  return locales[locale]
}
