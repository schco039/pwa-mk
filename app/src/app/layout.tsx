import type { Metadata, Viewport } from 'next'
import { Oswald, Montserrat } from 'next/font/google'
import { TrpcProvider } from '@/components/TrpcProvider'
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar'
import { I18nProvider } from '@/i18n/client'
import { getLocale } from '@/i18n'
import './globals.css'

const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-oswald',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Mamer Knights',
  description: 'Team management app for the Mamer Knights American Football team',
  manifest: '/manifest.json',
  icons: { apple: '/icons/apple-touch-icon.png' },
}

export const viewport: Viewport = {
  themeColor: '#1B2A4A',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return (
    <html lang={locale} className={`${oswald.variable} ${montserrat.variable}`}>
      <body>
        <TrpcProvider>
          <I18nProvider locale={locale}>
            <ServiceWorkerRegistrar />
            {children}
          </I18nProvider>
        </TrpcProvider>
      </body>
    </html>
  )
}
