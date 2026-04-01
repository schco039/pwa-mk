import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { validateSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppNav } from '@/components/AppNav'
import { EventStatus } from '@prisma/client'
import { format } from 'date-fns'

export default async function CoachEventsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value
  if (!token) redirect('/login')
  const user = await validateSession(token)
  if (!user || user.role === 'PLAYER') redirect('/dashboard')

  const events = await prisma.event.findMany({
    where: { isTemplate: false },
    orderBy: { date: 'desc' },
    take: 80,
    include: { _count: { select: { rsvps: true } } },
  })

  const upcoming = events.filter((e) => e.date >= new Date() && e.status !== EventStatus.CANCELLED)
  const past = events.filter((e) => e.date < new Date())
  const cancelled = events.filter((e) => e.status === EventStatus.CANCELLED)

  function EventRow({ event }: { event: (typeof events)[0] }) {
    return (
      <Link
        href={`/coach/events/${event.id}`}
        className="card flex items-center justify-between gap-3 hover:border-mk-gold/40 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs uppercase tracking-widest text-white/40">{event.type}</span>
            {event.status === EventStatus.CANCELLED && (
              <span className="text-xs text-red-400">Cancelled</span>
            )}
          </div>
          <p className="text-white font-semibold truncate">{event.title}</p>
          <p className="text-white/50 text-sm">{format(event.date, 'EEE d MMM yyyy')} · {event.startTime}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-mk-gold text-sm font-semibold">{event._count.rsvps}</p>
          <p className="text-white/30 text-xs">RSVPs</p>
        </div>
      </Link>
    )
  }

  return (
    <div className="min-h-screen pb-28">
      <AppNav userName={user.name} role={user.role} />
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-mk-gold uppercase tracking-widest">Events</h1>
          <Link href="/coach/events/new" className="btn-primary text-sm py-2">+ New</Link>
        </div>

        <section className="space-y-2">
          <h2 className="font-display text-sm uppercase tracking-widest text-white/40">Upcoming</h2>
          {upcoming.length === 0 && <p className="text-white/30 text-sm">None scheduled.</p>}
          {upcoming.map((e) => <EventRow key={e.id} event={e} />)}
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-sm uppercase tracking-widest text-white/40">Past</h2>
          {past.slice(0, 20).map((e) => <EventRow key={e.id} event={e} />)}
        </section>

        {cancelled.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-display text-sm uppercase tracking-widest text-white/40">Cancelled</h2>
            {cancelled.map((e) => <EventRow key={e.id} event={e} />)}
          </section>
        )}
      </main>
    </div>
  )
}
