import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { validateSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppNav } from '@/components/AppNav'
import { AttendanceForm } from '@/components/AttendanceForm'
import { CancelEventButton } from '@/components/CancelEventButton'
import { EventStatus } from '@prisma/client'
import { format, isPast } from 'date-fns'

export default async function CoachEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value
  if (!token) redirect('/login')
  const user = await validateSession(token)
  if (!user || user.role === 'PLAYER') redirect('/dashboard')

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      rsvps: {
        include: { user: { select: { id: true, name: true, jerseyNumber: true, role: true } } },
        orderBy: { updatedAt: 'desc' },
      },
      attendances: {
        include: { user: { select: { id: true, name: true, jerseyNumber: true } } },
      },
    },
  })
  if (!event) notFound()

  const allPlayers = await prisma.user.findMany({
    where: { role: 'PLAYER' },
    orderBy: [{ jerseyNumber: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, jerseyNumber: true },
  })

  const rsvpMap = Object.fromEntries(event.rsvps.map((r) => [r.userId, r]))
  const attendanceMap = Object.fromEntries(event.attendances.map((a) => [a.userId, a]))

  const yes = event.rsvps.filter((r) => r.status === 'YES')
  const no = event.rsvps.filter((r) => r.status === 'NO')
  const maybe = event.rsvps.filter((r) => r.status === 'MAYBE')
  const pending = allPlayers.filter((p) => !rsvpMap[p.id])

  const eventPast = isPast(event.date)

  return (
    <div className="min-h-[100dvh] pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
      <AppNav userName={user.name} role={user.role} />
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-5">

        {/* Header */}
        <div className="card space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-widest text-white/40">{event.type}</span>
                {event.status === EventStatus.CANCELLED && (
                  <span className="text-xs text-red-400 border border-red-400/30 rounded px-1">Cancelled</span>
                )}
              </div>
              <h1 className="font-display text-xl font-bold text-mk-gold">{event.title}</h1>
              <p className="text-white/60 text-sm mt-1">
                {format(event.date, 'EEEE, d MMMM yyyy')} · {event.startTime}
                {event.endTime && `–${event.endTime}`}
              </p>
              {event.location && <p className="text-white/50 text-sm">{event.location}</p>}
              {event.notes && <p className="text-white/40 text-sm mt-2">{event.notes}</p>}
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <Link href={`/coach/events/${id}/edit`} className="btn-ghost text-sm py-1.5 px-3">Edit</Link>
              {event.status !== EventStatus.CANCELLED && (
                <CancelEventButton eventId={id} />
              )}
            </div>
          </div>
        </div>

        {/* RSVP Summary */}
        <div className="card">
          <h2 className="font-display text-lg font-semibold text-mk-gold mb-4 uppercase tracking-wide">RSVP</h2>
          <div className="grid grid-cols-4 gap-2 mb-4 text-center">
            {[
              { label: 'Coming', count: yes.length, color: 'text-green-400' },
              { label: "Can't", count: no.length, color: 'text-red-400' },
              { label: 'Maybe', count: maybe.length, color: 'text-yellow-400' },
              { label: 'Pending', count: pending.length, color: 'text-white/30' },
            ].map((s) => (
              <div key={s.label} className="bg-mk-navy-dark rounded-lg p-2">
                <p className={`text-2xl font-display font-bold ${s.color}`}>{s.count}</p>
                <p className="text-white/40 text-xs uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Player lists */}
          <div className="space-y-3">
            {yes.length > 0 && (
              <div>
                <p className="text-green-400 text-xs uppercase tracking-widest mb-1">Coming ({yes.length})</p>
                <div className="space-y-1">
                  {yes.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 text-sm text-white/80">
                      {r.user.jerseyNumber && <span className="text-white/30 w-6 text-right">#{r.user.jerseyNumber}</span>}
                      <span>{r.user.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {no.length > 0 && (
              <div>
                <p className="text-red-400 text-xs uppercase tracking-widest mb-1">Can't make it ({no.length})</p>
                <div className="space-y-1">
                  {no.map((r) => (
                    <div key={r.id} className="text-sm text-white/60">
                      {r.user.name}{r.reason && <span className="text-white/30 ml-2">— {r.reason}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pending.length > 0 && (
              <div>
                <p className="text-white/30 text-xs uppercase tracking-widest mb-1">No response ({pending.length})</p>
                <div className="flex flex-wrap gap-1">
                  {pending.map((p) => (
                    <span key={p.id} className="text-xs text-white/40 bg-white/5 rounded px-2 py-0.5">{p.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Attendance (post-event) */}
        {eventPast && (
          <div className="card">
            <h2 className="font-display text-lg font-semibold text-mk-gold mb-4 uppercase tracking-wide">
              Attendance
            </h2>
            <AttendanceForm
              eventId={id}
              players={allPlayers}
              existingAttendance={Object.fromEntries(
                Object.entries(attendanceMap).map(([uid, a]) => [uid, a.present])
              )}
            />
          </div>
        )}
      </main>
    </div>
  )
}
