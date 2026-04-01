import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EventType, EventStatus } from '@prisma/client'

export async function GET() {
  const games = await prisma.event.findMany({
    where: { type: EventType.GAME, isPublic: true, isTemplate: false },
    orderBy: { date: 'asc' },
    select: {
      id: true,
      title: true,
      date: true,
      startTime: true,
      location: true,
      opponent: true,
      homeAway: true,
      scoreUs: true,
      scoreThem: true,
      result: true,
      status: true,
    },
  })
  return NextResponse.json(games)
}
