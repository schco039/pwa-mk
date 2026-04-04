'use client'

import { useState, useEffect } from 'react'
import { useT } from '@/i18n/client'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const t = useT()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [dismissed, setDismissed] = useState(true) // start hidden

  useEffect(() => {
    // Already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if ((navigator as any).standalone === true) return // iOS standalone
    // User dismissed this session
    if (sessionStorage.getItem('knights_install_dismissed')) return

    // Listen for the native prompt (Chrome/Edge/Android)
    function handler(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setDismissed(false)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // If beforeinstallprompt doesn't fire within 3s, show manual instructions
    // (iOS Safari, Firefox, HTTP contexts)
    const timer = setTimeout(() => {
      setShowManual(true)
      setDismissed(false)
    }, 3000)

    // If it did fire, cancel the manual fallback
    function cancelManual() { clearTimeout(timer) }
    window.addEventListener('beforeinstallprompt', cancelManual, { once: true })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      clearTimeout(timer)
    }
  }, [])

  if (dismissed) return null

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setDismissed(true)
    }
  }

  function handleDismiss() {
    setDismissed(true)
    sessionStorage.setItem('knights_install_dismissed', '1')
  }

  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-50">
      <div className="max-w-2xl mx-auto bg-mk-navy-dark border border-mk-gold/30 rounded-xl p-4 shadow-2xl flex items-center gap-4">
        <img src="/icons/icon-192.png" alt="" className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-display font-bold text-sm">{t.install.title}</p>
          <p className="text-white/50 text-xs mt-0.5">
            {deferredPrompt
              ? t.install.description
              : isIOS
                ? t.install.iosHint
                : t.install.manualHint}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {deferredPrompt ? (
            <button onClick={handleInstall} className="btn-primary text-xs py-1.5 px-4">
              {t.install.button}
            </button>
          ) : null}
          <button
            onClick={handleDismiss}
            className="text-white/30 text-xs hover:text-white/50 transition-colors"
          >
            {t.install.dismiss}
          </button>
        </div>
      </div>
    </div>
  )
}
