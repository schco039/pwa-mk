import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { deleteSession } from '@/lib/auth'

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value

  if (token) await deleteSession(token)

  cookieStore.delete('knights_session')

  return NextResponse.redirect(new URL('/login', process.env.APP_URL ?? 'http://localhost:3000'))
}
