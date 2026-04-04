import { cookies, headers } from 'next/headers'
import { en } from './translations/en'
import { de } from './translations/de'
import { fr } from './translations/fr'
import type { Translations } from './translations/en'

export type Locale = 'en' | 'de' | 'fr'
export type { Translations }

export const locales: Record<Locale, Translations> = { en, de, fr }
export const localeLabels: Record<Locale, string> = { en: 'EN', de: 'DE', fr: 'FR' }

const SUPPORTED: Locale[] = ['en', 'de', 'fr']

function parseAcceptLanguage(header: string): Locale {
  const parts = header.split(',').map((p) => {
    const [lang, q] = p.trim().split(';q=')
    return { lang: lang.trim().toLowerCase(), q: q ? parseFloat(q) : 1 }
  }).sort((a, b) => b.q - a.q)

  for (const { lang } of parts) {
    const short = lang.split('-')[0] as Locale
    if (SUPPORTED.includes(short)) return short
  }
  return 'en'
}

/** Read locale: cookie → Accept-Language header → 'en' */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const val = cookieStore.get('knights_locale')?.value
  if (val === 'de' || val === 'fr' || val === 'en') return val

  const headerStore = await headers()
  const accept = headerStore.get('accept-language')
  if (accept) return parseAcceptLanguage(accept)

  return 'en'
}

/** Get translations for a locale */
export function getT(locale: Locale) {
  return locales[locale]
}
