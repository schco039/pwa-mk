'use client'

import { trpc } from '@/lib/trpc'

export function EventAbsences({ eventId }: { eventId: string }) {
  const { data: absences = [], isLoading } = trpc.absences.forEvent.useQuery({ eventId })

  if (isLoading) return <p className="text-white/30 text-sm">Loading…</p>
  if (absences.length === 0) return <p className="text-white/30 text-sm">No players absent.</p>

  return (
    <div className="space-y-1">
      <p className="text-yellow-400 text-xs uppercase tracking-widest mb-2">
        {absences.length} player{absences.length !== 1 ? 's' : ''} absent
      </p>
      {absences.map((a) => (
        <div key={a.id} className="flex items-center gap-2 text-sm text-white/70">
          {a.user.jerseyNumber && (
            <span className="text-white/30 w-6 text-right">#{a.user.jerseyNumber}</span>
          )}
          <span>{a.user.name}</span>
          {a.reason && <span className="text-white/30 text-xs">— {a.reason}</span>}
        </div>
      ))}
    </div>
  )
}
