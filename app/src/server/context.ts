import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { type User } from '@prisma/client'

export type AuthUser = User & { sessionId: string }

export interface Context {
  prisma: typeof prisma
  user: AuthUser | null
  sessionToken: string | null
}

export async function createContext(): Promise<Context> {
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value ?? null

  const user = token ? await validateSession(token) : null

  return { prisma, user, sessionToken: token }
}
