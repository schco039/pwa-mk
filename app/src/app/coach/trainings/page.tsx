import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { validateSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppNav } from '@/components/AppNav'
import { TrainingCoachView } from '@/components/TrainingCoachView'
import { EventType, EventStatus } from '@prisma/client'
import { subDays, addWeeks } from 'date-fns'

export default async function CoachTrainingsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value
  if (!token) redirect('/login')
  const user = await validateSession(token)
  if (!user || user.role === 'PLAYER') redirect('/dashboard')

  const now = new Date()
  const twoWeeksAgo = subDays(now, 14)
  const tenWeeksAhead = addWeeks(now, 10)

  const trainings = await prisma.event.findMany({
    where: {
      type: EventType.TRAINING,
      isTemplate: false,
      status: { not: EventStatus.CANCELLED },
      date: { gte: twoWeeksAgo, lte: tenWeeksAhead },
    },
    orderBy: { date: 'asc' },
    include: {
      rsvps: { where: { userId: user.id } },
      attendances: { select: { id: true } },
      _count: { select: { rsvps: true, attendances: true } },
    },
  })

  const serialized = trainings.map((t) => ({
    id: t.id,
    title: t.title,
    date: t.date.toISOString(),
    startTime: t.startTime,
    endTime: t.endTime,
    location: t.location,
    category: t.category,
    myRsvp: (t.rsvps[0]?.status ?? null) as 'YES' | 'NO' | 'MAYBE' | null,
    attendanceCount: t._count.attendances,
    isPast: new Date(`${t.date.toISOString().split('T')[0]}T${t.endTime ?? t.startTime}:00`) < now,
    hasAttendance: t._count.attendances > 0,
  }))

  return (
    <div className="min-h-[100dvh] pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
      <AppNav userName={user.name} role={user.role} />
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <h1 className="font-display text-2xl font-bold text-mk-gold uppercase tracking-widest">Trainings</h1>
        <TrainingCoachView trainings={serialized} />
      </main>
    </div>
  )
}
