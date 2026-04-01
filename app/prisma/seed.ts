import { PrismaClient, Role, EventType, EventStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create a demo coach (for local dev — pahekoId 0 is a placeholder)
  const coach = await prisma.user.upsert({
    where: { email: 'coach@mamerknights.lu' },
    update: {},
    create: {
      pahekoId: 1,
      email: 'coach@mamerknights.lu',
      name: 'Head Coach',
      role: Role.COACH,
    },
  })

  const player1 = await prisma.user.upsert({
    where: { email: 'player1@mamerknights.lu' },
    update: {},
    create: {
      pahekoId: 2,
      email: 'player1@mamerknights.lu',
      name: 'Max Mustermann',
      role: Role.PLAYER,
      jerseyNumber: 42,
      position: 'WR',
    },
  })

  // Create a sample training event
  await prisma.event.upsert({
    where: { id: 'seed-training-1' },
    update: {},
    create: {
      id: 'seed-training-1',
      type: EventType.TRAINING,
      title: 'Weekly Training',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      startTime: '19:00',
      endTime: '21:00',
      location: 'Stade de Mamer',
      status: EventStatus.ACTIVE,
      isPublic: true,
    },
  })

  // Create a sample game
  await prisma.event.upsert({
    where: { id: 'seed-game-1' },
    update: {},
    create: {
      id: 'seed-game-1',
      type: EventType.GAME,
      title: 'vs Zephyrs',
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
      startTime: '15:00',
      location: 'Stade de Mamer',
      opponent: 'Luxembourg Zephyrs',
      homeAway: 'HOME',
      status: EventStatus.ACTIVE,
      isPublic: true,
    },
  })

  console.log(`Seeded: coach=${coach.id}, player=${player1.id}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
