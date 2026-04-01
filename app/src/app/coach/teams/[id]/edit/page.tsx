import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppNav } from '@/components/AppNav'
import { TeamForm } from '@/components/TeamForm'

export default async function EditTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value
  if (!token) redirect('/login')
  const user = await validateSession(token)
  if (!user || user.role === 'PLAYER') redirect('/dashboard')

  const team = await prisma.team.findUnique({ where: { id } })
  if (!team) notFound()

  return (
    <div className="min-h-screen pb-28">
      <AppNav userName={user.name} role={user.role} />
      <main className="max-w-2xl mx-auto px-4 pt-6">
        <h1 className="font-display text-2xl font-bold text-mk-gold uppercase tracking-widest mb-6">Edit Team</h1>
        <TeamForm initial={team} />
      </main>
    </div>
  )
}
