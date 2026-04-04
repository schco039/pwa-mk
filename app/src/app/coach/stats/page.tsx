import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppNav } from '@/components/AppNav'
import { getLocale, getT } from '@/i18n'

export default async function CoachStatsPage() {
  const locale = await getLocale()
  const t = getT(locale)
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value
  if (!token) redirect('/login')
  const user = await validateSession(token)
  if (!user || user.role === 'PLAYER') redirect('/dashboard')

  const since = new Date()
  since.setMonth(since.getMonth() - 3)

  const records = await prisma.attendance.findMany({
    where: { event: { date: { gte: since }, isTemplate: false } },
    include: {
      user: { select: { id: true, name: true, role: true, jerseyNumber: true } },
      event: { select: { id: true, title: true, date: true, type: true } },
    },
  })

  // Group by player
  const byPlayer = new Map<string, { user: (typeof records)[0]['user']; total: number; present: number }>()
  for (const rec of records) {
    if (rec.user.role !== 'PLAYER') continue
    const entry = byPlayer.get(rec.userId) ?? { user: rec.user, total: 0, present: 0 }
    entry.total++
    if (rec.present) entry.present++
    byPlayer.set(rec.userId, entry)
  }

  const players = Array.from(byPlayer.values())
    .map((p) => ({ ...p, rate: p.total > 0 ? Math.round((p.present / p.total) * 100) : null }))
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1))

  const teamTotal = records.filter((r) => r.user.role === 'PLAYER').length
  const teamPresent = records.filter((r) => r.user.role === 'PLAYER' && r.present).length
  const teamRate = teamTotal > 0 ? Math.round((teamPresent / teamTotal) * 100) : null

  return (
    <div className="min-h-[100dvh] pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
      <AppNav userName={user.name} role={user.role} />
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        <h1 className="font-display text-2xl font-bold text-mk-gold uppercase tracking-widest">{t.stats.teamStats}</h1>

        <div className="card text-center">
          <p className="text-5xl font-display font-bold text-mk-gold">{teamRate !== null ? `${teamRate}%` : '—'}</p>
          <p className="text-white/50 text-sm mt-1">{t.stats.teamAttendance}</p>
          <p className="text-white/30 text-xs">{teamPresent} / {teamTotal} · {t.stats.last3Months}</p>
        </div>

        {/* Per-player table */}
        <div className="card space-y-1">
          <h2 className="font-display text-sm uppercase tracking-widest text-white/40 mb-3">{t.stats.byPlayer}</h2>
          {players.length === 0 && (
            <p className="text-white/30 text-sm">{t.stats.noAttendanceData}</p>
          )}
          {players.map((p) => (
            <div key={p.user.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              {p.user.jerseyNumber && (
                <span className="text-white/30 text-xs w-6 text-right">#{p.user.jerseyNumber}</span>
              )}
              <span className="flex-1 text-white/80 text-sm">{p.user.name}</span>
              <div className="text-right">
                <span className={`text-sm font-semibold ${
                  p.rate === null ? 'text-white/30'
                    : p.rate >= 70 ? 'text-green-400'
                    : p.rate >= 50 ? 'text-yellow-400'
                    : 'text-red-400'
                }`}>
                  {p.rate !== null ? `${p.rate}%` : '—'}
                </span>
                <span className="text-white/30 text-xs ml-2">{p.present}/{p.total}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
