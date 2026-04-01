import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const ALLOWED_TYPES = ['application/pdf']
const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await validateSession(token)
  if (!user || user.role !== 'COMITE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const title = (formData.get('title') as string | null)?.trim()
  const category = (formData.get('category') as string | null)?.trim()
  const downloadable = formData.get('downloadable') === 'true'

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  if (!category) return NextResponse.json({ error: 'Category required' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only PDF files are allowed.' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 20 MB).' }, { status: 400 })
  }

  const fileName = `${randomUUID()}.pdf`
  const uploadDir = join(process.cwd(), '..', 'uploads', 'docs')
  await mkdir(uploadDir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(join(uploadDir, fileName), buffer)

  const doc = await prisma.document.create({
    data: { title, category, fileName, mimeType: file.type, downloadable },
  })

  return NextResponse.json({ id: doc.id })
}
