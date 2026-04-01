'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'

interface Player {
  id: string
  name: string
  jerseyNumber: number | null
}

interface AttendanceFormProps {
  eventId: string
  players: Player[]
  existingAttendance: Record<string, boolean>
}

export function AttendanceForm({ eventId, players, existingAttendance }: AttendanceFormProps) {
  const router = useRouter()
  const [attendance, setAttendance] = useState<Record<string, boolean>>(existingAttendance)

  const record = trpc.attendance.record.useMutation({
    onSuccess: () => router.refresh(),
  })

  function toggle(userId: string) {
    setAttendance((prev) => ({ ...prev, [userId]: !prev[userId] }))
  }

  function markAll(present: boolean) {
    setAttendance(Object.fromEntries(players.map((p) => [p.id, present])))
  }

  function handleSave() {
    record.mutate({
      eventId,
      records: players.map((p) => ({ userId: p.id, present: attendance[p.id] ?? false })),
    })
  }

  const presentCount = Object.values(attendance).filter(Boolean).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/60 text-sm">
          <span className="text-green-400 font-semibold">{presentCount}</span> / {players.length} present
        </p>
        <div className="flex gap-2">
          <button onClick={() => markAll(true)} className="text-xs text-green-400 hover:underline">All present</button>
          <span className="text-white/20">·</span>
          <button onClick={() => markAll(false)} className="text-xs text-red-400 hover:underline">All absent</button>
        </div>
      </div>

      <div className="space-y-1">
        {players.map((player) => {
          const present = attendance[player.id] ?? false
          return (
            <button
              key={player.id}
              type="button"
              onClick={() => toggle(player.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                present ? 'bg-green-900/30 border border-green-600/30' : 'bg-white/5 border border-transparent'
              }`}
            >
              <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                present ? 'bg-green-500 border-green-500' : 'border-white/20'
              }`}>
                {present && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              {player.jerseyNumber && (
                <span className="text-white/30 text-xs w-6">#{player.jerseyNumber}</span>
              )}
              <span className={`text-sm ${present ? 'text-white' : 'text-white/60'}`}>{player.name}</span>
            </button>
          )
        })}
      </div>

      {record.error && <p className="text-red-400 text-sm">{record.error.message}</p>}

      <button
        onClick={handleSave}
        disabled={record.isPending}
        className="btn-primary w-full"
      >
        {record.isPending ? 'Saving...' : 'Save Attendance'}
      </button>
    </div>
  )
}
