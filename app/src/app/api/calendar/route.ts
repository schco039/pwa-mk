import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { prisma } from '@/lib/prisma'

function calendarToken(userId: string): string {
  const secret = process.env.SESSION_SECRET ?? 'fallback-secret'
  return createHmac('sha256', secret).update(userId + ':calendar').digest('hex').slice(0, 32)
}

function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function icsEscape(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function foldLine(line: string): string {
  const bytes = Buffer.from(line, 'utf8')
  if (bytes.length <= 75) return line
  const parts: string[] = []
  let offset = 0
  let first = true
  while (offset < bytes.length) {
    const chunkSize = first ? 75 : 74
    parts.push((first ? '' : ' ') + bytes.slice(offset, offset + chunkSize).toString('utf8'))
    offset += chunkSize
    first = false
  }
  return parts.join('\r\n')
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user')
  const token = searchParams.get('token')

  if (!userId || !token) {
    return new NextResponse('Missing parameters', { status: 400 })
  }

  const expected = calendarToken(userId)
  if (token !== expected) {
    return new NextResponse('Invalid token', { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return new NextResponse('User not found', { status: 404 })

  const events = await prisma.event.findMany({
    where: {
      isTemplate: false,
      date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // last 30 days onward
      status: { not: 'CANCELLED' },
    },
    orderBy: { date: 'asc' },
  })

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Mamer Knights//Knights App//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Mamer Knights`,
    'X-WR-CALDESC:Mamer Knights Training & Games',
    'X-WR-TIMEZONE:Europe/Luxembourg',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ]

  for (const event of events) {
    const startDate = new Date(event.date)
    // Parse startTime like "19:00"
    const [startH, startM] = event.startTime.split(':').map(Number)
    startDate.setHours(startH, startM, 0, 0)

    const endDate = new Date(event.date)
    if (event.endTime) {
      const [endH, endM] = event.endTime.split(':').map(Number)
      endDate.setHours(endH, endM, 0, 0)
    } else {
      endDate.setHours(startH + 2, startM, 0, 0)
    }

    const categoryLabel = event.category === 'FLAG' ? ' [Flag]' : event.category === 'TACKLE' ? ' [Tackle]' : ''
    const summary = icsEscape(event.title + categoryLabel)
    const location = event.location ? icsEscape(event.location) : ''
    const description = [
      event.type,
      event.category ? `Category: ${event.category}` : '',
      event.notes ? `Notes: ${event.notes}` : '',
    ].filter(Boolean).join('\\n')

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${event.id}@mamer-knights`)
    lines.push(`DTSTAMP:${icsDate(new Date())}`)
    lines.push(`DTSTART:${icsDate(startDate)}`)
    lines.push(`DTEND:${icsDate(endDate)}`)
    lines.push(foldLine(`SUMMARY:${summary}`))
    if (location) lines.push(foldLine(`LOCATION:${location}`))
    if (description) lines.push(foldLine(`DESCRIPTION:${description}`))
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  const ics = lines.join('\r\n') + '\r\n'

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="knights.ics"',
      'Cache-Control': 'no-cache',
    },
  })
}

export { calendarToken }
