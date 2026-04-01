import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppNav } from '@/components/AppNav'
import { EventForm } from '@/components/EventForm'
import { format } from 'date-fns'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value
  if (!token) redirect('/login')
  const user = await validateSession(token)
  if (!user || user.role === 'PLAYER') redirect('/dashboard')

  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) notFound()

  return (
    <div className="min-h-screen pb-24">
      <AppNav userName={user.name} role={user.role} />
      <main className="max-w-2xl mx-auto px-4 pt-6">
        <h1 className="font-display text-2xl font-bold text-mk-gold uppercase tracking-widest mb-6">
          Edit Event
        </h1>
        <EventForm
          initial={{
            id: event.id,
            type: event.type,
            title: event.title,
            date: format(event.date, 'yyyy-MM-dd'),
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.location,
            opponent: event.opponent,
            homeAway: event.homeAway,
            notes: event.notes,
            isPublic: event.isPublic,
            isTemplate: event.isTemplate,
          }}
        />
      </main>
    </div>
  )
}
