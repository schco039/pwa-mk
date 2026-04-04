import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppNav } from '@/components/AppNav'
import { BulkEventManager } from '@/components/BulkEventManager'
import { EventStatus, EventType } from '@prisma/client'
import { addWeeks } from 'date-fns'
import { getLocale, getT } from '@/i18n'

export default async function BulkEventsPage() {
  const locale = await getLocale()
  const t = getT(locale)
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value
  if (!token) redirect('/login')
  const user = await validateSession(token)
  if (!user || user.role !== 'COMITE') redirect('/dashboard')

  const events = await prisma.event.findMany({
    where: {
      isTemplate: false,
      date: { gte: new Date() },
    },
    orderBy: { date: 'asc' },
    take: 200,
    select: {
      id: true,
      type: true,
      title: true,
      date: true,
      startTime: true,
      endTime: true,
      location: true,
      category: true,
      status: true,
    },
  })

  const serialized = events.map((e) => ({
    ...e,
    date: e.date.toISOString(),
    type: e.type as string,
    status: e.status as string,
  }))

  return (
    <div className="min-h-[100dvh] pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
      <AppNav userName={user.name} role={user.role} />
      <main className="max-w-2xl mx-auto px-4 pt-6">
        <h1 className="font-display text-2xl font-bold text-mk-gold uppercase tracking-widest mb-6">
          {t.events.bulkEditEvents}
        </h1>
        <BulkEventManager events={serialized} />
      </main>
    </div>
  )
}
