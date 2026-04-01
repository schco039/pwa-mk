import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { validateSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppNav } from '@/components/AppNav'
import { RsvpButton } from '@/components/RsvpButton'
import { EventType, EventStatus } from '@prisma/client'
import { format, isPast } from 'date-fns'

const typeLabel: Record<EventType, string> = {
  GAME: 'Game',
  TRAINING: 'Training',
  EVENT: 'Event',
}

const typeColor: Record<EventType, string> = {
  GAME: 'text-mk-gold border-mk-gold/40',
  TRAINING: 'text-blue-400 border-blue-400/30',
  EVENT: 'text-purple-400 border-purple-400/30',
}

export default async function SchedulePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value
  if (!token) redirect('/login')
  const user = await validateSession(token)
  if (!user) redirect('/login')

  const events = await prisma.event.findMany({
    where: {
      status: { not: EventStatus.CANCELLED },
      isTemplate: false,
      date: { gte: new Date(new Date().setDate(new Date().getDate() - 7)) }, // include last week
    },
    orderBy: { date: 'asc' },
    take: 60,
  })

  const eventIds = events.map((e) => e.id)
  const myRsvps = await prisma.rsvp.findMany({
    where: { userId: user.id, eventId: { in: eventIds } },
  })
  const rsvpMap = Object.fromEntries(myRsvps.map((r) => [r.eventId, r.status as 'YES' | 'NO' | 'MAYBE']))

  const upcoming = events.filter((e) => !isPast(e.date) || format(e.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'))
  const past = events.filter((e) => isPast(e.date) && format(e.date, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd'))

  return (
    <div className="min-h-screen pb-24">
      <AppNav userName={user.name} role={user.role} />

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <h1 className="font-display text-2xl font-bold text-mk-gold uppercase tracking-widest">Schedule</h1>

        {/* Upcoming */}
        <section className="space-y-3">
          {upcoming.length === 0 && (
            <div className="card text-white/40 text-sm">No upcoming events scheduled.</div>
          )}
          {upcoming.map((event) => (
            <div key={event.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs uppercase tracking-widest border rounded px-2 py-0.5 ${typeColor[event.type]}`}>
                      {typeLabel[event.type]}
                    </span>
                    {event.status === 'CANCELLED' && (
                      <span className="text-xs uppercase tracking-widest border rounded px-2 py-0.5 text-red-400 border-red-400/30">
                        Cancelled
                      </span>
                    )}
                  </div>
                  <p className="text-white font-semibold">
                    {event.type === 'GAME' && event.opponent
                      ? `${event.homeAway === 'HOME' ? 'vs' : '@'} ${event.opponent}`
                      : event.title}
                  </p>
                  <p className="text-white/60 text-sm mt-0.5">
                    {format(event.date, 'EEE d MMM')} · {event.startTime}
                    {event.endTime && `–${event.endTime}`}
                  </p>
                  {event.location && <p className="text-white/40 text-xs mt-0.5">{event.location}</p>}
                </div>
                {user.role !== 'PLAYER' && (
                  <Link
                    href={`/coach/events/${event.id}`}
                    className="text-white/30 hover:text-mk-gold text-xs uppercase tracking-wide flex-shrink-0"
                  >
                    Manage
                  </Link>
                )}
              </div>

              {event.status !== 'CANCELLED' && (
                <RsvpButton eventId={event.id} currentStatus={rsvpMap[event.id] ?? null} />
              )}
              {event.status === 'CANCELLED' && event.cancelReason && (
                <p className="text-red-400/70 text-xs">Reason: {event.cancelReason}</p>
              )}
            </div>
          ))}
        </section>

        {/* Past events (last 7 days) */}
        {past.length > 0 && (
          <section>
            <h2 className="font-display text-sm uppercase tracking-widest text-white/30 mb-3">Recent</h2>
            <div className="space-y-2">
              {past.map((event) => (
                <div key={event.id} className="card opacity-60 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs uppercase tracking-widest border rounded px-2 py-0.5 ${typeColor[event.type]}`}>
                      {typeLabel[event.type]}
                    </span>
                    <p className="text-white text-sm font-semibold">
                      {event.type === 'GAME' && event.opponent
                        ? `${event.homeAway === 'HOME' ? 'vs' : '@'} ${event.opponent}`
                        : event.title}
                    </p>
                  </div>
                  <p className="text-white/50 text-xs">
                    {format(event.date, 'EEE d MMM')} · {event.startTime}
                    {event.result && (
                      <span className="ml-2 text-mk-gold font-semibold">
                        {event.scoreUs}–{event.scoreThem} ({event.result})
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
