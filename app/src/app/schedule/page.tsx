import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppNav } from '@/components/AppNav'
import { ScheduleView } from '@/components/ScheduleView'
import { EventStatus } from '@prisma/client'
import { addWeeks } from 'date-fns'

export default async function SchedulePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value
  if (!token) redirect('/login')
  const user = await validateSession(token)
  if (!user) redirect('/login')

  const since = new Date()
  since.setDate(since.getDate() - 7) // include last week for "recent" section

  // Fetch next ~12 weeks of events (client will paginate further)
  const until = addWeeks(new Date(), 12)

  const events = await prisma.event.findMany({
    where: {
      isTemplate: false,
      date: { gte: since, lte: until },
    },
    orderBy: { date: 'asc' },
    take: 200,
  })

  const eventIds = events.map((e) => e.id)
  const myRsvps = await prisma.rsvp.findMany({
    where: { userId: user.id, eventId: { in: eventIds } },
  })
  const rsvpMap = Object.fromEntries(myRsvps.map((r) => [r.eventId, r.status as 'YES' | 'NO' | 'MAYBE']))

  const serialized = events.map((e) => ({
    id: e.id,
    type: e.type as string,
    title: e.title,
    date: e.date.toISOString(),
    startTime: e.startTime,
    endTime: e.endTime,
    location: e.location,
    opponent: e.opponent,
    homeAway: e.homeAway as string | null,
    status: e.status as string,
    cancelReason: e.cancelReason,
    category: e.category,
    allowMaybe: e.allowMaybe,
    scoreUs: e.scoreUs,
    scoreThem: e.scoreThem,
    result: e.result as string | null,
    myRsvp: rsvpMap[e.id] ?? null,
  }))

  return (
    <div className="min-h-[100dvh] pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
      <AppNav userName={user.name} role={user.role} />
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-1">
        <h1 className="font-display text-2xl font-bold text-mk-gold uppercase tracking-widest mb-5">Schedule</h1>
        <ScheduleView events={serialized} isCoach={user.role !== 'PLAYER'} hideTraining={user.role === 'COACH'} />
      </main>
    </div>
  )
}
