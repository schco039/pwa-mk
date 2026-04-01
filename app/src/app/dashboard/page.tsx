import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value
  if (!token) redirect('/login')

  const user = await validateSession(token)
  if (!user) redirect('/login')

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      {/* Nav */}
      <header className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl font-bold tracking-widest text-mk-gold uppercase">
          Mamer Knights
        </h1>
        <form action="/api/auth/logout" method="POST">
          <button className="text-white/50 text-sm hover:text-white/80 transition-colors">
            Sign out
          </button>
        </form>
      </header>

      {/* Welcome */}
      <div className="card mb-6">
        <p className="text-white/50 text-sm uppercase tracking-widest">Welcome back</p>
        <h2 className="font-display text-3xl font-bold text-mk-gold mt-1">{user.name}</h2>
        <span className="inline-block mt-2 px-3 py-1 rounded-full bg-mk-navy-dark border border-white/10 text-xs uppercase tracking-widest text-white/60">
          {user.role}
        </span>
      </div>

      {/* Placeholder sections — Phase 1 MVP */}
      <div className="grid gap-4">
        <div className="card">
          <h3 className="font-display text-lg font-semibold text-mk-gold mb-2 uppercase tracking-wide">
            Next Training
          </h3>
          <p className="text-white/50 text-sm">Coming soon — event management in progress.</p>
        </div>

        <div className="card">
          <h3 className="font-display text-lg font-semibold text-mk-gold mb-2 uppercase tracking-wide">
            Next Game
          </h3>
          <p className="text-white/50 text-sm">Coming soon — event management in progress.</p>
        </div>

        {user.role !== 'PLAYER' && (
          <div className="card border-mk-gold/30">
            <h3 className="font-display text-lg font-semibold text-mk-gold mb-2 uppercase tracking-wide">
              Coach Panel
            </h3>
            <p className="text-white/50 text-sm">
              Event creation and attendance tools — Phase 2.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
