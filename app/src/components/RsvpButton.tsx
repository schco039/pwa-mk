'use client'

import { trpc } from '@/lib/trpc'
import { useRouter } from 'next/navigation'

interface RsvpButtonProps {
  eventId: string
  currentStatus: 'YES' | 'NO' | 'MAYBE' | null
  allowMaybe?: boolean
}

export function RsvpButton({ eventId, currentStatus, allowMaybe = false }: RsvpButtonProps) {
  const router = useRouter()
  const setRsvp = trpc.rsvp.set.useMutation({
    onSuccess: () => router.refresh(),
  })

  const options = [
    { status: 'YES' as const, label: "I'm coming", className: 'bg-green-600 text-white hover:bg-green-500' },
    { status: 'NO' as const, label: "Can't make it", className: 'bg-red-700/80 text-white hover:bg-red-600' },
    ...(allowMaybe
      ? [{ status: 'MAYBE' as const, label: 'Maybe', className: 'bg-white/10 text-white hover:bg-white/20' }]
      : []),
  ]

  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => {
        const active = currentStatus === opt.status
        return (
          <button
            key={opt.status}
            onClick={() => setRsvp.mutate({ eventId, status: opt.status })}
            disabled={setRsvp.isPending}
            className={`px-4 py-2 rounded-lg text-sm font-display uppercase tracking-wide transition-all ${
              opt.className
            } ${active ? 'ring-2 ring-mk-gold ring-offset-2 ring-offset-mk-navy font-bold' : 'opacity-70'}`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
