'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

type RsvpStatus = 'YES' | 'NO' | 'MAYBE'

export interface ScheduleEvent {
  id: string
  type: string
  title: string
  date: string // ISO string from server
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

const PREF_KEY = 'knights_training_filter'
const DEFAULT_SHOW = 3

// Category badge component
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

function RsvpButtons({ event }: { event: ScheduleEvent }) {
  const router = useRouter()
  const setRsvp = trpc.rsvp.set.useMutation({ onSuccess: () => router.refresh() })
  const options = [
    { status: 'YES' as const, label: "Coming", base: 'bg-green-600 hover:bg-green-500' },
    { status: 'NO' as const, label: "Can't", base: 'bg-red-700/80 hover:bg-red-600' },
    ...(event.allowMaybe ? [{ status: 'MAYBE' as const, label: 'Maybe', base: 'bg-white/10 hover:bg-white/20' }] : []),
  ]
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((opt) => (
        <button key={opt.status}
          onClick={() => setRsvp.mutate({ eventId: event.id, status: opt.status })}
          disabled={setRsvp.isPending}
          className={`px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wide text-white transition-all ${opt.base} ${
            event.myRsvp === opt.status ? 'ring-2 ring-mk-gold ring-offset-1 ring-offset-mk-navy opacity-100 font-bold' : 'opacity-60'
          }`}
        >{opt.label}</button>
      ))}
    </div>
  )
}

function EventCard({ event, isCoach }: { event: ScheduleEvent; isCoach: boolean }) {
  const date = new Date(event.date)
  const isPast = date < new Date()
  const isCancelled = event.status === 'CANCELLED'

  const displayTitle = event.type === 'GAME' && event.opponent
    ? `${event.homeAway === 'HOME' ? 'vs' : '@'} ${event.opponent}`
    : event.title

  return (
    <div className={`card space-y-2 ${isPast || isCancelled ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <CategoryBadge category={event.category} />
            {isCancelled && (
              <span className="text-xs border rounded px-1.5 py-0.5 text-red-400 border-red-400/30">Cancelled</span>
            )}
          </div>
          <p className="text-white font-semibold text-sm">{displayTitle}</p>
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
          {isCancelled && event.cancelReason && (
            <p className="text-red-400/60 text-xs mt-1">Reason: {event.cancelReason}</p>
          )}
        </div>
        {isCoach && (
          <Link href={`/coach/events/${event.id}`} className="text-white/20 hover:text-mk-gold text-xs flex-shrink-0 transition-colors">
            Manage
          </Link>
        )}
      </div>
      {!isPast && !isCancelled && <RsvpButtons event={event} />}
    </div>
  )
}

function Section({
  title,
  events,
  isCoach,
  color,
  filter,
}: {
  title: string
  events: ScheduleEvent[]
  isCoach: boolean
  color: string
  filter?: React.ReactNode
}) {
  const [shown, setShown] = useState(DEFAULT_SHOW)
  const visible = events.slice(0, shown)
  const hasMore = events.length > shown

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`font-display text-lg font-bold uppercase tracking-widest ${color}`}>{title}</h2>
        {filter}
      </div>

      {events.length === 0 ? (
        <div className="card text-white/30 text-sm">None scheduled.</div>
      ) : (
        <div className="space-y-2">
          {visible.map((e) => <EventCard key={e.id} event={e} isCoach={isCoach} />)}
          {hasMore && (
            <button
              onClick={() => setShown((s) => s + DEFAULT_SHOW)}
              className="w-full py-2 rounded-lg border border-white/10 text-white/40 text-xs font-display uppercase tracking-wide hover:border-white/30 hover:text-white/60 transition-colors"
            >
              Show more ({events.length - shown} remaining)
            </button>
          )}
        </div>
      )}
    </section>
  )
}

export function ScheduleView({ events, isCoach, hideTraining = false }: { events: ScheduleEvent[]; isCoach: boolean; hideTraining?: boolean }) {
  const [trainingFilter, setTrainingFilter] = useState<'' | 'FLAG' | 'TACKLE'>('')

  useEffect(() => {
    const saved = localStorage.getItem(PREF_KEY)
    if (saved === 'FLAG' || saved === 'TACKLE') setTrainingFilter(saved)
  }, [])

  function setFilter(val: '' | 'FLAG' | 'TACKLE') {
    setTrainingFilter(val)
    localStorage.setItem(PREF_KEY, val)
  }

  const now = new Date()

  // Sort upcoming first, then by date ascending — fix for out-of-order display
  const upcoming = [...events]
    .filter((e) => new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const trainings = upcoming.filter((e) => {
    if (e.type !== 'TRAINING') return false
    if (trainingFilter === '') return true
    // If event has no category (= both), always include. If it has one, must match.
    return !e.category || e.category === trainingFilter
  })

  const games = upcoming.filter((e) => e.type === 'GAME')
  const otherEvents = upcoming.filter((e) => e.type === 'EVENT')

  const filterUI = (
    <div className="flex gap-1.5">
      {([
        { v: '' as const, l: 'All' },
        { v: 'FLAG' as const, l: '🏴' },
        { v: 'TACKLE' as const, l: '🏈' },
      ]).map((opt) => (
        <button key={opt.v} onClick={() => setFilter(opt.v)}
          className={`px-2.5 py-1 rounded-lg text-xs font-display uppercase tracking-wide border transition-colors ${
            trainingFilter === opt.v
              ? 'bg-mk-gold text-mk-navy border-mk-gold'
              : 'text-white/40 border-white/20 hover:border-white/40'
          }`}
        >{opt.l}</button>
      ))}
    </div>
  )

  return (
    <div className="space-y-8">
      {!hideTraining && (
        <Section
          title="Training"
          events={trainings}
          isCoach={isCoach}
          color="text-blue-400"
          filter={filterUI}
        />
      )}
      <Section
        title="Games"
        events={games}
        isCoach={isCoach}
        color="text-mk-gold"
      />
      <Section
        title="Events"
        events={otherEvents}
        isCoach={isCoach}
        color="text-purple-400"
      />
    </div>
  )
}
