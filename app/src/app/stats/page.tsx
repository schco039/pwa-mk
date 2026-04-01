import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppNav } from '@/components/AppNav'
import { format } from 'date-fns'

export default async function StatsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value
  if (!token) redirect('/login')
  const user = await validateSession(token)
  if (!user) redirect('/login')

  const since = new Date()
  since.setMonth(since.getMonth() - 3)

  const records = await prisma.attendance.findMany({
    where: {
      userId: user.id,
      event: { date: { gte: since }, isTemplate: false },
    },
    include: { event: { select: { id: true, title: true, date: true, type: true } } },
    orderBy: { event: { date: 'desc' } },
  })

  const total = records.length
  const present = records.filter((r) => r.present).length
  const rate = total > 0 ? Math.round((present / total) * 100) : null

  // Team average for comparison
  const teamRecords = await prisma.attendance.findMany({
    where: { event: { date: { gte: since }, isTemplate: false } },
  })
  const teamTotal = teamRecords.length
  const teamPresent = teamRecords.filter((r) => r.present).length
  const teamRate = teamTotal > 0 ? Math.round((teamPresent / teamTotal) * 100) : null

  return (
    <div className="min-h-screen pb-28">
      <AppNav userName={user.name} role={user.role} />
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        <h1 className="font-display text-2xl font-bold text-mk-gold uppercase tracking-widest">My Stats</h1>

        {/* Rate cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card text-center">
            <p className={`text-5xl font-display font-bold ${rate !== null ? (rate >= 70 ? 'text-green-400' : rate >= 50 ? 'text-yellow-400' : 'text-red-400') : 'text-white/30'}`}>
              {rate !== null ? `${rate}%` : '—'}
            </p>
            <p className="text-white/50 text-sm mt-1">My attendance</p>
            <p className="text-white/30 text-xs">last 3 months</p>
          </div>
          <div className="card text-center">
            <p className="text-5xl font-display font-bold text-white/40">
              {teamRate !== null ? `${teamRate}%` : '—'}
            </p>
            <p className="text-white/50 text-sm mt-1">Team average</p>
            <p className="text-white/30 text-xs">last 3 months</p>
          </div>
        </div>

        <div className="card">
          <p className="text-white/50 text-sm">
            <span className="text-white font-semibold">{present}</span> present out of{' '}
            <span className="text-white font-semibold">{total}</span> recorded sessions
          </p>
        </div>

        {/* History */}
        <div className="card space-y-2">
          <h2 className="font-display text-sm uppercase tracking-widest text-white/40 mb-3">History</h2>
          {records.length === 0 && (
            <p className="text-white/30 text-sm">No attendance recorded yet.</p>
          )}
          {records.map((rec) => (
            <div key={rec.id} className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${rec.present ? 'bg-green-500' : 'bg-red-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-sm truncate">{rec.event.title}</p>
                <p className="text-white/40 text-xs">{format(rec.event.date, 'EEE d MMM yyyy')}</p>
              </div>
              <span className={`text-xs uppercase tracking-wide ${rec.present ? 'text-green-400' : 'text-red-400'}`}>
                {rec.present ? 'Present' : 'Absent'}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
