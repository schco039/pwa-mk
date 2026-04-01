import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EventType, EventStatus } from '@prisma/client'

export async function GET() {
  const game = await prisma.event.findFirst({
    where: {
      type: EventType.GAME,
      isPublic: true,
      isTemplate: false,
      status: EventStatus.ACTIVE,
      date: { gte: new Date() },
    },
    orderBy: { date: 'asc' },
    select: {
      id: true,
      title: true,
      date: true,
      startTime: true,
      location: true,
      opponent: true,
      homeAway: true,
      status: true,
    },
  })
  if (!game) return NextResponse.json(null)
  return NextResponse.json(game)
}
