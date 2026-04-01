import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value
  if (!token) return new NextResponse('Unauthorized', { status: 401 })
  const user = await validateSession(token)
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { id } = await params
  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc) return new NextResponse('Not found', { status: 404 })

  const filePath = join(process.cwd(), '..', 'uploads', 'docs', doc.fileName)
  let buffer: Buffer
  try {
    buffer = await readFile(filePath)
  } catch {
    return new NextResponse('File not found', { status: 404 })
  }

  const headers = new Headers()
  headers.set('Content-Type', doc.mimeType)
  headers.set('Content-Length', buffer.length.toString())

  if (doc.downloadable) {
    headers.set('Content-Disposition', `attachment; filename="${doc.fileName}"`)
  } else {
    // View in browser, prevent save-as via JS — best effort
    headers.set('Content-Disposition', `inline; filename="${doc.fileName}"`)
    headers.set('X-Content-Type-Options', 'nosniff')
  }

  // Prevent caching of sensitive docs
  headers.set('Cache-Control', 'private, no-store')

  return new NextResponse(buffer, { headers })
}
