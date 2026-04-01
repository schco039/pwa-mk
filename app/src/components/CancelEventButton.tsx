'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'

export function CancelEventButton({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [reason, setReason] = useState('')

  const cancel = trpc.events.cancel.useMutation({
    onSuccess: () => {
      setShowConfirm(false)
      router.refresh()
    },
  })

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="text-red-400 border border-red-400/30 rounded-lg text-sm py-1.5 px-3 hover:bg-red-400/10 transition-colors"
      >
        Cancel
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-mk-navy rounded-xl border border-white/10 p-6 w-full max-w-sm space-y-4">
        <h3 className="font-display text-lg font-bold text-mk-gold">Cancel Event?</h3>
        <p className="text-white/60 text-sm">This will notify all players.</p>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="input-field text-left tracking-normal"
        />
        {cancel.error && <p className="text-red-400 text-sm">{cancel.error.message}</p>}
        <div className="flex gap-3">
          <button
            onClick={() => cancel.mutate({ id: eventId, reason: reason || undefined })}
            disabled={cancel.isPending}
            className="flex-1 py-2.5 rounded-lg bg-red-700 text-white font-display uppercase tracking-wide text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {cancel.isPending ? 'Cancelling...' : 'Yes, Cancel'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="flex-1 btn-ghost text-sm py-2.5"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  )
}
