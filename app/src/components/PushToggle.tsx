'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { useT } from '@/i18n/client'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function PushToggle() {
  const t = useT()
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  const subscribe = trpc.push.subscribe.useMutation()
  const unsubscribe = trpc.push.unsubscribe.useMutation()

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setLoading(false)
      return
    }
    setSupported(true)
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub)
        setLoading(false)
      }),
    )
  }, [])

  async function toggle() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready

      if (subscribed) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await sub.unsubscribe()
          const keys = sub.toJSON().keys
          if (keys) await unsubscribe.mutateAsync({ endpoint: sub.endpoint })
        }
        setSubscribed(false)
      } else {
        const res = await fetch('/api/push/vapid-public-key')
        const { key } = await res.json()
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        })
        const json = sub.toJSON()
        await subscribe.mutateAsync({
          endpoint: sub.endpoint,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
        })
        setSubscribed(true)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!supported) return null

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border transition-colors ${
        subscribed
          ? 'bg-mk-gold/10 border-mk-gold/40 text-mk-gold'
          : 'bg-white/5 border-white/10 text-white/60'
      }`}
    >
      <span className="text-xl">{subscribed ? '🔔' : '🔕'}</span>
      <span className="text-sm font-display uppercase tracking-wide">
        {loading ? t.common.loading : subscribed ? t.push.notificationsOn : t.push.enableNotifications}
      </span>
    </button>
  )
}
