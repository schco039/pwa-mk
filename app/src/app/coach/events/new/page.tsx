import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth'
import { AppNav } from '@/components/AppNav'
import { EventForm } from '@/components/EventForm'

export default async function NewEventPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value
  if (!token) redirect('/login')
  const user = await validateSession(token)
  if (!user || user.role === 'PLAYER') redirect('/dashboard')

  return (
    <div className="min-h-screen pb-24">
      <AppNav userName={user.name} role={user.role} />
      <main className="max-w-2xl mx-auto px-4 pt-6">
        <h1 className="font-display text-2xl font-bold text-mk-gold uppercase tracking-widest mb-6">
          Create Event
        </h1>
        <EventForm />
      </main>
    </div>
  )
}
