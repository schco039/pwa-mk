import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EventType, EventStatus } from '@prisma/client'

export async function GET() {
  const training = await prisma.event.findFirst({
    where: {
      type: EventType.TRAINING,
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
      endTime: true,
      location: true,
      status: true,
    },
  })
  if (!training) return NextResponse.json(null)
  return NextResponse.json(training)
}
