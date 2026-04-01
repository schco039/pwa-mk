import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { validateSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppNav } from '@/components/AppNav'
import { RsvpButton } from '@/components/RsvpButton'
import { EventType, EventStatus } from '@prisma/client'
import { format } from 'date-fns'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value
  if (!token) redirect('/login')
  const user = await validateSession(token)
  if (!user) redirect('/login')

  const now = new Date()

  const [nextTraining, nextGame, attendanceStats] = await Promise.all([
    // Next training
    prisma.event.findFirst({
      where: { type: EventType.TRAINING, status: EventStatus.ACTIVE, isTemplate: false, date: { gte: now } },
      orderBy: { date: 'asc' },
    }),
    // Next game
    prisma.event.findFirst({
      where: { type: EventType.GAME, status: EventStatus.ACTIVE, isTemplate: false, date: { gte: now } },
      orderBy: { date: 'asc' },
    }),
    // Personal attendance rate (last 3 months)
    (async () => {
      const since = new Date()
      since.setMonth(since.getMonth() - 3)
      const records = await prisma.attendance.findMany({
        where: { userId: user.id, event: { date: { gte: since }, isTemplate: false } },
      })
      const total = records.length
      const present = records.filter((r) => r.present).length
      return { total, present, rate: total > 0 ? Math.round((present / total) * 100) : null }
    })(),
  ])

  // Get user's RSVP for next training
  const myTrainingRsvp = nextTraining
    ? await prisma.rsvp.findUnique({
        where: { userId_eventId: { userId: user.id, eventId: nextTraining.id } },
      })
    : null

  // Coach: RSVP counts for next training
  let rsvpCounts: { yes: number; no: number; maybe: number; pending: number } | null = null
  if (nextTraining && user.role !== 'PLAYER') {
    const [totalPlayers, rsvps] = await Promise.all([
      prisma.user.count({ where: { role: 'PLAYER' } }),
      prisma.rsvp.findMany({ where: { eventId: nextTraining.id } }),
    ])
    const yes = rsvps.filter((r) => r.status === 'YES').length
    const no = rsvps.filter((r) => r.status === 'NO').length
    const maybe = rsvps.filter((r) => r.status === 'MAYBE').length
    rsvpCounts = { yes, no, maybe, pending: totalPlayers - rsvps.length }
  }

  return (
    <div className="min-h-screen pb-28">
      <AppNav userName={user.name} role={user.role} />

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        {/* Welcome */}
        <div className="card">
          <p className="text-white/50 text-sm uppercase tracking-widest">Welcome back</p>
          <h2 className="font-display text-3xl font-bold text-mk-gold mt-1">{user.name}</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="px-3 py-1 rounded-full bg-mk-navy-dark border border-white/10 text-xs uppercase tracking-widest text-white/60">
              {user.role}
            </span>
            {attendanceStats.rate !== null && (
              <span className="text-white/50 text-sm">
                Attendance: <span className="text-mk-gold font-semibold">{attendanceStats.rate}%</span>
                <span className="text-white/30 ml-1">(last 3 months)</span>
              </span>
            )}
          </div>
        </div>

        {/* Next Training */}
        <div className="card">
          <h3 className="font-display text-lg font-semibold text-mk-gold mb-3 uppercase tracking-wide">
            Next Training
          </h3>
          {nextTraining ? (
            <div className="space-y-3">
              <div>
                <p className="text-white font-semibold">{nextTraining.title}</p>
                <p className="text-white/60 text-sm mt-1">
                  {format(nextTraining.date, 'EEEE, d MMMM yyyy')} · {nextTraining.startTime}
                  {nextTraining.endTime && `–${nextTraining.endTime}`}
                </p>
                {nextTraining.location && (
                  <p className="text-white/50 text-sm">{nextTraining.location}</p>
                )}
              </div>

              <RsvpButton eventId={nextTraining.id} currentStatus={myTrainingRsvp?.status ?? null} allowMaybe={nextTraining.allowMaybe} />

              {/* Coach RSVP summary */}
              {rsvpCounts && (
                <div className="flex gap-4 pt-1 border-t border-white/10 text-sm">
                  <span className="text-green-400">{rsvpCounts.yes} coming</span>
                  <span className="text-red-400">{rsvpCounts.no} out</span>
                  <span className="text-yellow-400">{rsvpCounts.maybe} maybe</span>
                  <span className="text-white/30">{rsvpCounts.pending} pending</span>
                  <Link href={`/coach/events/${nextTraining.id}`} className="ml-auto text-mk-gold hover:underline">
                    View details →
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <p className="text-white/40 text-sm">No upcoming training scheduled.</p>
          )}
        </div>

        {/* Next Game */}
        <div className="card">
          <h3 className="font-display text-lg font-semibold text-mk-gold mb-3 uppercase tracking-wide">
            Next Game
          </h3>
          {nextGame ? (
            <div>
              <p className="text-white font-semibold">
                {nextGame.homeAway === 'HOME' ? 'vs' : '@'} {nextGame.opponent ?? nextGame.title}
              </p>
              <p className="text-white/60 text-sm mt-1">
                {format(nextGame.date, 'EEEE, d MMMM yyyy')} · {nextGame.startTime}
              </p>
              {nextGame.location && <p className="text-white/50 text-sm">{nextGame.location}</p>}
              <span className="inline-block mt-2 text-xs uppercase tracking-widest text-white/40 border border-white/10 rounded px-2 py-0.5">
                {nextGame.homeAway ?? 'TBD'}
              </span>
            </div>
          ) : (
            <p className="text-white/40 text-sm">No upcoming games scheduled.</p>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/schedule" className="card flex flex-col gap-1 hover:border-mk-gold/40 transition-colors">
            <span className="font-display text-sm uppercase tracking-wide text-mk-gold">Schedule</span>
            <span className="text-white/40 text-xs">All events & RSVP</span>
          </Link>
          <Link href="/stats" className="card flex flex-col gap-1 hover:border-mk-gold/40 transition-colors">
            <span className="font-display text-sm uppercase tracking-wide text-mk-gold">My Stats</span>
            <span className="text-white/40 text-xs">Attendance history</span>
          </Link>
          {user.role !== 'PLAYER' && (
            <Link href="/coach/events/new" className="card flex flex-col gap-1 hover:border-mk-gold/40 transition-colors col-span-2">
              <span className="font-display text-sm uppercase tracking-wide text-mk-gold">+ Create Event</span>
              <span className="text-white/40 text-xs">Add training, game or event</span>
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}
