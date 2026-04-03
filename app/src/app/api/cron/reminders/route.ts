import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushToUser, getPushSettings } from '@/lib/push'
import { EventType, EventStatus } from '@prisma/client'
import { addHours } from 'date-fns'

// Called by a cron job every hour: GET /api/cron/reminders?secret=CRON_SECRET
export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await getPushSettings()
  const now = new Date()
  const in48h = addHours(now, 48)

  const upcoming = await prisma.event.findMany({
    where: {
      type: { in: [EventType.TRAINING, EventType.GAME] },
      status: EventStatus.ACTIVE,
      isTemplate: false,
      date: { gte: now, lte: in48h },
    },
  })

  let sent = 0

  for (const event of upcoming) {
    const hoursUntil = (event.date.getTime() - now.getTime()) / 3_600_000

    // ── 24h reminder ────────────────────────────────────────────────────────
    if (hoursUntil >= 22 && hoursUntil <= 26) {
      const rsvpedUserIds = (
        await prisma.rsvp.findMany({ where: { eventId: event.id }, select: { userId: true } })
      ).map((r) => r.userId)

      const noRsvpPlayers = await prisma.user.findMany({
        where: { role: 'PLAYER', id: { notIn: rsvpedUserIds } },
        select: { id: true },
      })

      if (event.type === EventType.TRAINING && settings.training24h) {
        for (const player of noRsvpPlayers) {
          await sendPushToUser(player.id, {
            title: 'Training tomorrow 🏈',
            body: `${event.title} at ${event.startTime}${event.location ? ` — ${event.location}` : ''}. Are you coming?`,
            url: '/schedule',
            type: 'TRAINING_24H',
            eventId: event.id,
          })
          sent++
        }
      }

      if (event.type === EventType.GAME && settings.game24h) {
        const opponent = event.opponent ?? 'Unknown'
        const location = event.homeAway === 'HOME' ? 'Home' : event.location ?? 'Away'
        for (const player of noRsvpPlayers) {
          await sendPushToUser(player.id, {
            title: 'Game tomorrow 🏆',
            body: `vs ${opponent} — ${event.startTime} · ${location}. Are you in?`,
            url: '/schedule',
            type: 'GAME_24H',
            eventId: event.id,
          })
          sent++
        }
      }
    }

    // ── 2h reminder (trainings only — players who said YES) ─────────────────
    if (event.type === EventType.TRAINING && hoursUntil >= 1.5 && hoursUntil <= 2.5 && settings.training2h) {
      const yesPlayers = await prisma.rsvp.findMany({
        where: { eventId: event.id, status: 'YES' },
        select: { userId: true },
      })
      for (const p of yesPlayers) {
        await sendPushToUser(p.userId, {
          title: 'Training in 2 hours 🏈',
          body: `${event.title} at ${event.startTime}${event.location ? ` — ${event.location}` : ''}`,
          url: '/schedule',
          type: 'TRAINING_2H',
          eventId: event.id,
        })
        sent++
      }
    }
  }

  return NextResponse.json({ ok: true, sent, checked: upcoming.length })
}
