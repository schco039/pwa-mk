'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { format } from 'date-fns'
import { useT } from '@/i18n/client'

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
        {useT().trainings.canCoach}
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
        {useT().trainings.cantCoach}
      </button>
    </div>
  )
}

export function TrainingCoachView({ trainings }: { trainings: Training[] }) {
  const t = useT()
  const [filter, setFilter] = useState<'' | 'FLAG' | 'TACKLE'>('')

  const filtered = filter === '' ? trainings : trainings.filter((tr) => !tr.category || tr.category === filter)
  const upcoming = filtered.filter((tr) => !tr.isPast)
  const past = filtered.filter((tr) => tr.isPast)

  function TrainingCard({ training: tr }: { training: Training }) {
    const date = new Date(tr.date)
    return (
      <div className="card space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <CategoryBadge category={tr.category} />
            </div>
            <p className="text-white font-semibold text-sm">{tr.title}</p>
            <p className="text-white/50 text-xs mt-0.5">
              {format(date, 'EEE d MMM')} · {tr.startTime}
              {tr.endTime && `–${tr.endTime}`}
            </p>
            {tr.location && <p className="text-white/30 text-xs">{tr.location}</p>}
          </div>
          {tr.isPast && (
            <Link
              href={`/coach/events/${tr.id}`}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-display uppercase tracking-wide transition-colors ${
                tr.hasAttendance
                  ? 'text-white/30 border border-white/10 hover:border-white/30'
                  : 'bg-mk-gold text-mk-navy font-bold'
              }`}
            >
              {tr.hasAttendance ? t.trainings.attendanceDone : t.trainings.enterAttendance}
            </Link>
          )}
        </div>
        {!tr.isPast && <AvailabilityButtons training={tr} />}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Category filter */}
      <div className="flex gap-2">
        {([['', t.common.all], ['FLAG', t.common.flag], ['TACKLE', t.common.tackle]] as const).map(([val, label]) => (
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
          {t.events.upcoming}
        </h2>
        {upcoming.length === 0 ? (
          <div className="card text-white/30 text-sm">{t.trainings.noTrainings}</div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((tr) => <TrainingCard key={tr.id} training={tr} />)}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-bold uppercase tracking-widest text-white/30 mb-3">
            {t.trainings.pastSection}
          </h2>
          <div className="space-y-2">
            {past.slice().reverse().map((tr) => <TrainingCard key={tr.id} training={tr} />)}
          </div>
        </section>
      )}
    </div>
  )
}
