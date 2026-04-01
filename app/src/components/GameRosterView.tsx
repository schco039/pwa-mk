'use client'

import { trpc } from '@/lib/trpc'

export function GameRosterView({ eventId }: { eventId: string }) {
  const { data: roster = [], isLoading } = trpc.roster.get.useQuery({ eventId })

  if (isLoading) return <p className="text-white/30 text-sm">Loading…</p>
  if (roster.length === 0) return <p className="text-white/30 text-sm">No roster set yet.</p>

  // Group by position
  const byPosition = new Map<string, typeof roster>()
  for (const r of roster) {
    const key = r.position ?? 'No position'
    const arr = byPosition.get(key) ?? []
    arr.push(r)
    byPosition.set(key, arr)
  }

  return (
    <div className="space-y-3">
      <p className="text-white/40 text-xs">{roster.length} players on roster</p>
      {[...byPosition.entries()].map(([pos, players]) => (
        <div key={pos}>
          <p className="text-mk-gold text-xs uppercase tracking-widest mb-1">{pos}</p>
          <div className="flex flex-wrap gap-2">
            {players.map((r) => (
              <span key={r.id} className="text-sm text-white/80 bg-white/5 rounded px-2.5 py-1">
                {r.user.jerseyNumber && <span className="text-white/30 text-xs mr-1">#{r.user.jerseyNumber}</span>}
                {r.user.name}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
