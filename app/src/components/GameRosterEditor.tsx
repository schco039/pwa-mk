'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { useT } from '@/i18n/client'

const POSITIONS = ['QB', 'WR', 'RB', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'ST']

interface Player {
  id: string
  name: string
  jerseyNumber: number | null
}

interface Props {
  eventId: string
  allPlayers: Player[]
}

export function GameRosterEditor({ eventId, allPlayers }: Props) {
  const t = useT()
  const utils = trpc.useUtils()
  const { data: roster = [] } = trpc.roster.get.useQuery({ eventId })

  const [selected, setSelected] = useState<Map<string, { position: string | null; jersey: number | null }>>(new Map())
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    const m = new Map<string, { position: string | null; jersey: number | null }>()
    for (const r of roster) {
      const p = allPlayers.find((pl) => pl.id === r.userId)
      m.set(r.userId, { position: r.position ?? null, jersey: r.jerseyNumber ?? p?.jerseyNumber ?? null })
    }
    setSelected(m)
    setDirty(false)
  }, [roster, allPlayers])

  const save = trpc.roster.set.useMutation({
    onSuccess: () => {
      utils.roster.get.invalidate({ eventId })
      setDirty(false)
    },
  })

  function toggle(playerId: string) {
    setDirty(true)
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else {
        const p = allPlayers.find((pl) => pl.id === playerId)
        next.set(playerId, { position: null, jersey: p?.jerseyNumber ?? null })
      }
      return next
    })
  }

  function setPos(playerId: string, pos: string | null) {
    setDirty(true)
    setSelected((prev) => {
      const next = new Map(prev)
      const cur = next.get(playerId) ?? { position: null, jersey: null }
      next.set(playerId, { ...cur, position: pos })
      return next
    })
  }

  function setJersey(playerId: string, jersey: number | null) {
    setDirty(true)
    setSelected((prev) => {
      const next = new Map(prev)
      const cur = next.get(playerId) ?? { position: null, jersey: null }
      next.set(playerId, { ...cur, jersey })
      return next
    })
  }

  function handleSave() {
    const entries = [...selected.entries()].map(([userId, { position, jersey }]) => ({
      userId,
      position: position ?? undefined,
      jerseyNumber: jersey ?? undefined,
    }))
    save.mutate({ eventId, entries })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-white/40 text-xs">{t.roster.playersSelected.replace('{count}', String(selected.size))}</p>
        <button
          onClick={handleSave}
          disabled={!dirty || save.isPending}
          className="btn-primary text-xs py-1.5 px-4 disabled:opacity-40"
        >
          {save.isPending ? t.common.saving : t.roster.saveRoster}
        </button>
      </div>

      <div className="space-y-1 max-h-96 overflow-y-auto">
        {allPlayers.map((p) => {
          const isOn = selected.has(p.id)
          const entry = selected.get(p.id)
          const pos = entry?.position ?? null
          const jersey = entry?.jersey ?? p.jerseyNumber ?? null
          return (
            <div
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors cursor-pointer ${
                isOn ? 'bg-mk-gold/10 border border-mk-gold/20' : 'bg-white/5 border border-transparent'
              }`}
            >
              <span className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                isOn ? 'bg-mk-gold border-mk-gold' : 'border-white/30'
              }`}>
                {isOn && (
                  <svg className="w-3 h-3 text-mk-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              {isOn ? (
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={jersey ?? ''}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setJersey(p.id, e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="#"
                  className="w-10 bg-mk-navy-dark text-white/60 text-xs rounded px-1.5 py-1 border border-white/20 text-center flex-shrink-0"
                />
              ) : (
                <span className="text-white/30 w-10 text-center text-xs flex-shrink-0">
                  {p.jerseyNumber ? `#${p.jerseyNumber}` : '—'}
                </span>
              )}
              <span className="text-sm text-white/80 flex-1 min-w-0 truncate">{p.name}</span>
              {isOn && (
                <select
                  value={pos ?? ''}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setPos(p.id, e.target.value || null)}
                  className="bg-mk-navy-dark text-white/60 text-xs rounded px-1.5 py-1 border border-white/10 flex-shrink-0"
                >
                  <option value="">{t.roster.position}</option>
                  {POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
