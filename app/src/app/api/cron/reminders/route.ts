import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushBroadcast, sendPushToUser } from '@/lib/push'
import { EventType, EventStatus } from '@prisma/client'
import { addHours } from 'date-fns'

// Called by a cron job every hour: GET /api/cron/reminders?secret=CRON_SECRET
export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const in2h = addHours(now, 2)
  const in24h = addHours(now, 24)
  const in48h = addHours(now, 48)

  // Find training events in the next 48h window
  const upcoming = await prisma.event.findMany({
    where: {
      type: EventType.TRAINING,
      status: EventStatus.ACTIVE,
      isTemplate: false,
      date: { gte: now, lte: in48h },
    },
  })

  let sent = 0

  for (const event of upcoming) {
    const hoursUntil = (event.date.getTime() - now.getTime()) / 3_600_000

    // 24h reminder → all players without RSVP
    if (hoursUntil >= 22 && hoursUntil <= 26) {
      const rsvpedUserIds = (
        await prisma.rsvp.findMany({ where: { eventId: event.id }, select: { userId: true } })
      ).map((r) => r.userId)

      const noRsvpPlayers = await prisma.user.findMany({
        where: { role: 'PLAYER', id: { notIn: rsvpedUserIds } },
        select: { id: true },
      })

      for (const player of noRsvpPlayers) {
        await sendPushToUser(player.id, {
          title: 'Training tomorrow 🏈',
          body: `${event.title} at ${event.startTime}${event.location ? ` — ${event.location}` : ''}. Are you coming?`,
          url: '/schedule',
        })
        sent++
      }
    }

    // 2h reminder → players who RSVP'd YES
    if (hoursUntil >= 1.5 && hoursUntil <= 2.5) {
      const yesPlayers = await prisma.rsvp.findMany({
        where: { eventId: event.id, status: 'YES' },
        select: { userId: true },
      })
      for (const p of yesPlayers) {
        await sendPushToUser(p.userId, {
          title: 'Training in 2 hours 🏈',
          body: `${event.title} at ${event.startTime}${event.location ? ` — ${event.location}` : ''}`,
          url: '/schedule',
        })
        sent++
      }
    }
  }

  return NextResponse.json({ ok: true, sent, checked: upcoming.length })
}
