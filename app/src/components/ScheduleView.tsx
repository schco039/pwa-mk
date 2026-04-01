'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { useRouter } from 'next/navigation'
import { format, addWeeks, startOfWeek, isWithinInterval, parseISO, isPast } from 'date-fns'

type RsvpStatus = 'YES' | 'NO' | 'MAYBE'

interface Event {
  id: string
  type: string
  title: string
  date: string // ISO string
  startTime: string
  endTime: string | null
  location: string | null
  opponent: string | null
  homeAway: string | null
  status: string
  cancelReason: string | null
  category: string | null
  allowMaybe: boolean
  scoreUs: number | null
  scoreThem: number | null
  result: string | null
  myRsvp: RsvpStatus | null
}

interface ScheduleViewProps {
  events: Event[]
  isCoach: boolean
}

const PREF_KEY = 'knights_training_filter'
const WEEKS_STEP = 3

const typeColor: Record<string, string> = {
  GAME: 'text-mk-gold border-mk-gold/40',
  TRAINING: 'text-blue-400 border-blue-400/30',
  EVENT: 'text-purple-400 border-purple-400/30',
}

function RsvpButtons({ event, currentStatus }: { event: Event; currentStatus: RsvpStatus | null }) {
  const router = useRouter()
  const setRsvp = trpc.rsvp.set.useMutation({ onSuccess: () => router.refresh() })

  const options = [
    { status: 'YES' as const, label: "Coming", className: 'bg-green-600 hover:bg-green-500' },
    { status: 'NO' as const, label: "Can't", className: 'bg-red-700/80 hover:bg-red-600' },
    ...(event.allowMaybe ? [{ status: 'MAYBE' as const, label: 'Maybe', className: 'bg-white/10 hover:bg-white/20' }] : []),
  ]

  return (
    <div className="flex gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.status}
          onClick={() => setRsvp.mutate({ eventId: event.id, status: opt.status })}
          disabled={setRsvp.isPending}
          className={`px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wide text-white transition-all ${opt.className} ${
            currentStatus === opt.status ? 'ring-2 ring-mk-gold ring-offset-1 ring-offset-mk-navy font-bold opacity-100' : 'opacity-60'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function EventCard({ event, isCoach }: { event: Event; isCoach: boolean }) {
  const date = new Date(event.date)
  const past = isPast(date)
  const categoryLabel = event.category === 'FLAG' ? '🏴 Flag' : event.category === 'TACKLE' ? '🏈 Tackle' : null

  return (
    <div className={`card space-y-2 ${past ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className={`text-xs uppercase tracking-widest border rounded px-1.5 py-0.5 ${typeColor[event.type]}`}>
              {event.type === 'TRAINING' && categoryLabel ? categoryLabel : event.type}
            </span>
            {event.status === 'CANCELLED' && (
              <span className="text-xs uppercase border rounded px-1.5 py-0.5 text-red-400 border-red-400/30">Cancelled</span>
            )}
          </div>
          <p className="text-white font-semibold text-sm">
            {event.type === 'GAME' && event.opponent
              ? `${event.homeAway === 'HOME' ? 'vs' : '@'} ${event.opponent}`
              : event.title}
          </p>
          <p className="text-white/50 text-xs mt-0.5">
            {format(date, 'EEE d MMM')} · {event.startTime}
            {event.endTime && `–${event.endTime}`}
            {event.result && (
              <span className="ml-2 text-mk-gold font-semibold">
                {event.scoreUs}–{event.scoreThem} ({event.result})
              </span>
            )}
          </p>
          {event.location && <p className="text-white/30 text-xs">{event.location}</p>}
          {event.status === 'CANCELLED' && event.cancelReason && (
            <p className="text-red-400/60 text-xs mt-1">Reason: {event.cancelReason}</p>
          )}
        </div>
        {isCoach && (
          <Link href={`/coach/events/${event.id}`} className="text-white/20 hover:text-mk-gold text-xs flex-shrink-0">
            Manage
          </Link>
        )}
      </div>

      {!past && event.status !== 'CANCELLED' && (
        <RsvpButtons event={event} currentStatus={event.myRsvp} />
      )}
    </div>
  )
}

export function ScheduleView({ events, isCoach }: ScheduleViewProps) {
  const [trainingFilter, setTrainingFilter] = useState<'' | 'FLAG' | 'TACKLE'>('')
  const [weeksShown, setWeeksShown] = useState(WEEKS_STEP)

  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem(PREF_KEY)
    if (saved === 'FLAG' || saved === 'TACKLE') setTrainingFilter(saved)
  }, [])

  function setFilter(val: '' | 'FLAG' | 'TACKLE') {
    setTrainingFilter(val)
    localStorage.setItem(PREF_KEY, val)
  }

  const now = new Date()
  const cutoff = addWeeks(now, weeksShown)

  // Filter events
  const filtered = events.filter((e) => {
    const date = new Date(e.date)
    // Apply training category filter
    if (e.type === 'TRAINING' && trainingFilter !== '') {
      // If event has a category, it must match. If no category (null = both), always show.
      if (e.category && e.category !== trainingFilter) return false
    }
    return true
  })

  const upcoming = filtered.filter((e) => {
    const date = new Date(e.date)
    return date >= now && date <= cutoff
  })

  const hasMore = filtered.some((e) => new Date(e.date) > cutoff)

  // Group upcoming by week
  const byWeek = new Map<string, Event[]>()
  for (const event of upcoming) {
    const weekStart = startOfWeek(new Date(event.date), { weekStartsOn: 1 })
    const key = format(weekStart, 'yyyy-MM-dd')
    if (!byWeek.has(key)) byWeek.set(key, [])
    byWeek.get(key)!.push(event)
  }

  const past = filtered.filter((e) => new Date(e.date) < now).slice(0, 5)

  return (
    <div className="space-y-5">
      {/* Training type filter */}
      <div>
        <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Training Filter</p>
        <div className="flex gap-2">
          {([
            { value: '' as const, label: 'All' },
            { value: 'FLAG' as const, label: '🏴 Flag Football' },
            { value: 'TACKLE' as const, label: '🏈 Tackle Football' },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wide transition-colors border ${
                trainingFilter === opt.value
                  ? 'bg-mk-gold text-mk-navy border-mk-gold'
                  : 'text-white/50 border-white/20 hover:border-white/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming events grouped by week */}
      {byWeek.size === 0 && (
        <div className="card text-white/40 text-sm">No upcoming events in the next {weeksShown} weeks.</div>
      )}

      {Array.from(byWeek.entries()).map(([weekKey, weekEvents]) => {
        const weekStart = new Date(weekKey)
        const weekEnd = addWeeks(weekStart, 1)
        return (
          <section key={weekKey}>
            <h2 className="font-display text-xs uppercase tracking-widest text-white/30 mb-2">
              Week of {format(weekStart, 'd MMM')}
            </h2>
            <div className="space-y-2">
              {weekEvents.map((e) => <EventCard key={e.id} event={e} isCoach={isCoach} />)}
            </div>
          </section>
        )
      })}

      {/* Load more */}
      {hasMore && (
        <button
          onClick={() => setWeeksShown((w) => w + WEEKS_STEP)}
          className="btn-ghost w-full text-sm"
        >
          Show {WEEKS_STEP} more weeks
        </button>
      )}

      {/* Recent past (last 5) */}
      {past.length > 0 && (
        <section>
          <h2 className="font-display text-xs uppercase tracking-widest text-white/30 mb-2">Recent</h2>
          <div className="space-y-2">
            {past.map((e) => <EventCard key={e.id} event={e} isCoach={isCoach} />)}
          </div>
        </section>
      )}
    </div>
  )
}
