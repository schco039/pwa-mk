import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { validateSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppNav } from '@/components/AppNav'
import { EventStatus } from '@prisma/client'
import { format } from 'date-fns'
import { getLocale, getT } from '@/i18n'

export default async function CoachEventsPage() {
  const locale = await getLocale()
  const t = getT(locale)
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value
  if (!token) redirect('/login')
  const user = await validateSession(token)
  if (!user || user.role !== 'COMITE') redirect('/dashboard')

  const events = await prisma.event.findMany({
    where: { isTemplate: false },
    orderBy: { date: 'asc' },
    take: 200,
    include: { _count: { select: { rsvps: true } } },
  })

  const now = new Date()
  const upcoming = events.filter((e) => e.date >= now && e.status !== EventStatus.CANCELLED)
  const past = events.filter((e) => e.date < now).reverse()
  const cancelled = events.filter((e) => e.status === EventStatus.CANCELLED && e.date >= now)

  function EventRow({ event }: { event: (typeof events)[0] }) {
    return (
      <Link
        href={`/coach/events/${event.id}`}
        className="card flex items-center justify-between gap-3 hover:border-mk-gold/40 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs uppercase tracking-widest text-white/40">{event.type}</span>
            {event.category === 'FLAG' && <span className="text-xs text-orange-400 border border-orange-400/30 rounded px-1">🏴 Flag</span>}
            {event.category === 'TACKLE' && <span className="text-xs text-blue-400 border border-blue-400/30 rounded px-1">🏈 Tackle</span>}
            {event.status === EventStatus.CANCELLED && (
              <span className="text-xs text-red-400">{t.common.cancelled}</span>
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
    <div className="min-h-[100dvh] pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
      <AppNav userName={user.name} role={user.role} />
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-mk-gold uppercase tracking-widest">{t.events.title}</h1>
          <div className="flex gap-2">
            <Link href="/coach/events/bulk" className="btn-ghost text-sm py-2">{t.events.bulkEdit}</Link>
            <Link href="/coach/events/new" className="btn-primary text-sm py-2">{t.events.newEvent}</Link>
          </div>
        </div>

        <section className="space-y-2">
          <h2 className="font-display text-sm uppercase tracking-widest text-white/40">{t.events.upcoming}</h2>
          {upcoming.length === 0 && <p className="text-white/30 text-sm">{t.schedule.noneScheduled}</p>}
          {upcoming.map((e) => <EventRow key={e.id} event={e} />)}
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-sm uppercase tracking-widest text-white/40">{t.events.past}</h2>
          {past.slice(0, 20).map((e) => <EventRow key={e.id} event={e} />)}
        </section>

        {cancelled.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-display text-sm uppercase tracking-widest text-white/40">{t.common.cancelled}</h2>
            {cancelled.map((e) => <EventRow key={e.id} event={e} />)}
          </section>
        )}
      </main>
    </div>
  )
}
