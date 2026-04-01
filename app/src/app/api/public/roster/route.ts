import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

export async function GET() {
  const players = await prisma.user.findMany({
    where: { role: Role.PLAYER },
    orderBy: [{ jerseyNumber: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      jerseyNumber: true,
      position: true,
    },
  })
  return NextResponse.json(players)
}
