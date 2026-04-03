import { prisma } from '@/lib/prisma'
import { EventType, EventStatus } from '@prisma/client'
import { format } from 'date-fns'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

// Embeddable widget — no nav, no auth required
// Usage: <iframe src="https://app.mamer-knights.lu/widget" ...></iframe>

async function getNextGame() {
  return prisma.event.findFirst({
    where: { type: EventType.GAME, isPublic: true, isTemplate: false, status: EventStatus.ACTIVE, date: { gte: new Date() } },
    orderBy: { date: 'asc' },
    select: { title: true, date: true, startTime: true, location: true, opponent: true, homeAway: true },
  })
}

async function getNextTrainings() {
  return prisma.event.findMany({
    where: { type: EventType.TRAINING, isPublic: true, isTemplate: false, status: EventStatus.ACTIVE, date: { gte: new Date() } },
    orderBy: { date: 'asc' },
    take: 2,
    select: { title: true, date: true, startTime: true, endTime: true, location: true, category: true },
  })
}

export default async function WidgetPage() {
  const [game, trainings] = await Promise.all([getNextGame(), getNextTrainings()])

  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0a1628;
            color: #fff;
            padding: 12px;
            min-height: 100vh;
          }
          .grid { display: flex; gap: 10px; flex-wrap: wrap; }
          .card {
            flex: 1; min-width: 200px;
            background: #111e35;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 10px;
            padding: 14px 16px;
          }
          .label {
            font-size: 9px; font-weight: 700; letter-spacing: 0.15em;
            text-transform: uppercase; color: rgba(255,255,255,0.35);
            margin-bottom: 8px;
          }
          .gold { color: #d4a843; }
          .title { font-size: 15px; font-weight: 700; color: #d4a843; margin-bottom: 4px; line-height: 1.2; }
          .meta { font-size: 12px; color: rgba(255,255,255,0.55); margin-top: 3px; }
          .badge {
            display: inline-block; font-size: 9px; font-weight: 700;
            letter-spacing: 0.1em; text-transform: uppercase;
            padding: 2px 7px; border-radius: 4px; margin-top: 6px;
          }
          .home { background: rgba(212,168,67,0.15); color: #d4a843; border: 1px solid rgba(212,168,67,0.3); }
          .away { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.1); }
          .flag { background: rgba(59,130,246,0.15); color: #60a5fa; border: 1px solid rgba(59,130,246,0.3); }
          .tackle { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
          .empty { color: rgba(255,255,255,0.3); font-size: 13px; }
          .logo-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
          .logo-text { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
          .trainings { display: flex; flex-direction: column; gap: 8px; }
          .training-row { padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.06); }
          .training-row:last-child { border-bottom: none; padding-bottom: 0; }
        `}</style>
      </head>
      <body>
        <div className="logo-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <img src="/icons/icon-72x72.png" width="24" height="24" alt="Mamer Knights" style={{ borderRadius: '4px' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#d4a843' }}>
            Mamer <span style={{ color: '#fff' }}>Knights</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Next Game */}
          <div style={{ flex: 1, minWidth: '200px', background: '#111e35', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}>
              Prochain match
            </div>
            {game ? (
              <>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#d4a843', marginBottom: '4px' }}>
                  vs {game.opponent ?? game.title}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginTop: '3px' }}>
                  {format(game.date, 'EEE d MMM')} · {game.startTime}
                </div>
                {game.location && (
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                    📍 {game.location}
                  </div>
                )}
                {game.homeAway && (
                  <span style={{
                    display: 'inline-block', fontSize: '9px', fontWeight: 700,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '2px 7px', borderRadius: '4px', marginTop: '6px',
                    ...(game.homeAway === 'HOME'
                      ? { background: 'rgba(212,168,67,0.15)', color: '#d4a843', border: '1px solid rgba(212,168,67,0.3)' }
                      : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' })
                    }}>
                    {game.homeAway === 'HOME' ? 'Domicile' : 'Extérieur'}
                  </span>
                )}
              </>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Aucun match prévu</div>
            )}
          </div>

          {/* Next Trainings */}
          <div style={{ flex: 1, minWidth: '200px', background: '#111e35', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}>
              Prochains entraînements
            </div>
            {trainings.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {trainings.map((t, i) => (
                  <div key={i} style={{ paddingBottom: i < trainings.length - 1 ? '8px' : 0, borderBottom: i < trainings.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                      {format(t.date, 'EEE d MMM')} · {t.startTime}{t.endTime ? `–${t.endTime}` : ''}
                    </div>
                    {t.location && (
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>📍 {t.location}</div>
                    )}
                    {t.category && (
                      <span style={{
                        display: 'inline-block', fontSize: '9px', fontWeight: 700,
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        padding: '2px 7px', borderRadius: '4px', marginTop: '4px',
                        ...(t.category === 'FLAG'
                          ? { background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }
                          : { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' })
                        }}>
                        {t.category}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Aucun entraînement prévu</div>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
