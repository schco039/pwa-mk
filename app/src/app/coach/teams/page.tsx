import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import Image from 'next/image'
import { validateSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppNav } from '@/components/AppNav'
import { DeleteTeamButton } from '@/components/DeleteTeamButton'

export default async function TeamsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value
  if (!token) redirect('/login')
  const user = await validateSession(token)
  if (!user || user.role === 'PLAYER') redirect('/dashboard')

  const teams = await prisma.team.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { games: true } } },
  })

  return (
    <div className="min-h-screen pb-24">
      <AppNav userName={user.name} role={user.role} />
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-mk-gold uppercase tracking-widest">Teams</h1>
          <Link href="/coach/teams/new" className="btn-primary text-sm py-2">+ New Team</Link>
        </div>

        {teams.length === 0 && (
          <div className="card text-white/40 text-sm">No teams yet. Add opponent teams here.</div>
        )}

        <div className="space-y-3">
          {teams.map((team) => (
            <div key={team.id} className="card flex items-center gap-4">
              {team.logoUrl ? (
                <img src={team.logoUrl} alt={team.name} className="w-12 h-12 object-contain rounded-lg bg-white/5 flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <span className="text-white/20 text-lg font-display font-bold">
                    {(team.shortName ?? team.name).charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">{team.name}</p>
                {team.shortName && <p className="text-white/40 text-xs">{team.shortName}</p>}
                {team.location && <p className="text-white/50 text-sm">{team.location}</p>}
                <p className="text-white/30 text-xs mt-0.5">{team._count.games} game{team._count.games !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link href={`/coach/teams/${team.id}/edit`} className="text-white/40 hover:text-mk-gold text-xs uppercase tracking-wide">
                  Edit
                </Link>
                <DeleteTeamButton teamId={team.id} teamName={team.name} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
