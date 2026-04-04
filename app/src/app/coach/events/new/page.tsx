import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppNav } from '@/components/AppNav'
import { EventForm } from '@/components/EventForm'
import { getLocale, getT } from '@/i18n'

export default async function NewEventPage() {
  const locale = await getLocale()
  const t = getT(locale)
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value
  if (!token) redirect('/login')
  const user = await validateSession(token)
  if (!user || user.role !== 'COMITE') redirect('/dashboard')

  const teams = await prisma.team.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="min-h-[100dvh] pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
      <AppNav userName={user.name} role={user.role} />
      <main className="max-w-2xl mx-auto px-4 pt-6">
        <h1 className="font-display text-2xl font-bold text-mk-gold uppercase tracking-widest mb-6">
          {t.events.createEvent}
        </h1>
        <EventForm teams={teams} />
      </main>
    </div>
  )
}
