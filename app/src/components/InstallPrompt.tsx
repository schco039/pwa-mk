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
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Don't show if user previously dismissed
    if (sessionStorage.getItem('knights_install_dismissed')) return

    function handler(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!deferredPrompt || dismissed) return null

  async function handleInstall() {
    await deferredPrompt!.prompt()
    const { outcome } = await deferredPrompt!.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  function handleDismiss() {
    setDismissed(true)
    sessionStorage.setItem('knights_install_dismissed', '1')
  }

  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-50 animate-in slide-in-from-bottom">
      <div className="max-w-2xl mx-auto bg-mk-navy-dark border border-mk-gold/30 rounded-xl p-4 shadow-2xl flex items-center gap-4">
        <img src="/icons/icon-192.png" alt="" className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-display font-bold text-sm">{t.install.title}</p>
          <p className="text-white/50 text-xs mt-0.5">{t.install.description}</p>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="btn-primary text-xs py-1.5 px-4"
          >
            {t.install.button}
          </button>
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
