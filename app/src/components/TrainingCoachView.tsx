'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { format } from 'date-fns'

type RsvpStatus = 'YES' | 'NO' | 'MAYBE' | null

interface Training {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string | null
  location: string | null
  category: string | null
  myRsvp: RsvpStatus
  attendanceCount: number
  isPast: boolean
  hasAttendance: boolean
}

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null
  return (
    <span className={`text-xs border rounded px-1.5 py-0.5 ${
      category === 'FLAG' ? 'text-orange-400 border-orange-400/30' : 'text-blue-400 border-blue-400/30'
    }`}>
      {category === 'FLAG' ? '🏴 Flag' : '🏈 Tackle'}
    </span>
  )
}

function AvailabilityButtons({ training }: { training: Training }) {
  const router = useRouter()
  const setRsvp = trpc.rsvp.set.useMutation({ onSuccess: () => router.refresh() })

  return (
    <div className="flex gap-2 mt-2">
      <button
        onClick={() => setRsvp.mutate({ eventId: training.id, status: 'YES' })}
        disabled={setRsvp.isPending}
        className={`flex-1 py-2 rounded-lg text-xs font-display uppercase tracking-wide transition-all ${
          training.myRsvp === 'YES'
            ? 'bg-green-600 text-white ring-2 ring-mk-gold ring-offset-1 ring-offset-mk-navy'
            : 'bg-green-600/20 text-green-400 hover:bg-green-600/40'
        }`}
      >
        ✓ Kann Training halten
      </button>
      <button
        onClick={() => setRsvp.mutate({ eventId: training.id, status: 'NO' })}
        disabled={setRsvp.isPending}
        className={`flex-1 py-2 rounded-lg text-xs font-display uppercase tracking-wide transition-all ${
          training.myRsvp === 'NO'
            ? 'bg-red-700 text-white ring-2 ring-mk-gold ring-offset-1 ring-offset-mk-navy'
            : 'bg-red-700/20 text-red-400 hover:bg-red-700/40'
        }`}
      >
        ✗ Kann nicht
      </button>
    </div>
  )
}

export function TrainingCoachView({ trainings }: { trainings: Training[] }) {
  const [filter, setFilter] = useState<'' | 'FLAG' | 'TACKLE'>('')

  const filtered = filter === '' ? trainings : trainings.filter((t) => !t.category || t.category === filter)
  const upcoming = filtered.filter((t) => !t.isPast)
  const past = filtered.filter((t) => t.isPast)

  function TrainingCard({ t }: { t: Training }) {
    const date = new Date(t.date)
    return (
      <div className="card space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <CategoryBadge category={t.category} />
            </div>
            <p className="text-white font-semibold text-sm">{t.title}</p>
            <p className="text-white/50 text-xs mt-0.5">
              {format(date, 'EEE d MMM')} · {t.startTime}
              {t.endTime && `–${t.endTime}`}
            </p>
            {t.location && <p className="text-white/30 text-xs">{t.location}</p>}
          </div>
          {t.isPast && (
            <Link
              href={`/coach/events/${t.id}`}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-display uppercase tracking-wide transition-colors ${
                t.hasAttendance
                  ? 'text-white/30 border border-white/10 hover:border-white/30'
                  : 'bg-mk-gold text-mk-navy font-bold'
              }`}
            >
              {t.hasAttendance ? 'Präsenz ✓' : 'Präsenz eintragen'}
            </Link>
          )}
        </div>
        {!t.isPast && <AvailabilityButtons training={t} />}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Category filter */}
      <div className="flex gap-2">
        {([['', 'Alle'], ['FLAG', '🏴 Flag'], ['TACKLE', '🏈 Tackle']] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wide transition-colors border ${
              filter === val ? 'bg-mk-gold text-mk-navy border-mk-gold' : 'text-white/50 border-white/20 hover:border-white/40'
            }`}
          >{label}</button>
        ))}
      </div>

      <section>
        <h2 className="font-display text-lg font-bold uppercase tracking-widest text-blue-400 mb-3">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <div className="card text-white/30 text-sm">Keine Trainings geplant.</div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((t) => <TrainingCard key={t.id} t={t} />)}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-bold uppercase tracking-widest text-white/30 mb-3">
            Vergangen
          </h2>
          <div className="space-y-2">
            {past.slice().reverse().map((t) => <TrainingCard key={t.id} t={t} />)}
          </div>
        </section>
      )}
    </div>
  )
}
