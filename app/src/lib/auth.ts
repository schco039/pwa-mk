import { SignJWT, jwtVerify } from 'jose'
import { prisma } from './prisma'
import { type User } from '@prisma/client'

const getSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not set')
  return new TextEncoder().encode(secret)
}

/** Generate a 6-digit OTP code */
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/** Sign a JWT and persist the session in the DB */
export async function createSession(userId: string, days: number): Promise<string> {
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecret())

  await prisma.session.create({ data: { userId, token, expiresAt } })

  return token
}

/** Validate a session token and return the associated user, or null */
export async function validateSession(
  token: string,
): Promise<(User & { sessionId: string }) | null> {
  try {
    await jwtVerify(token, getSecret())
  } catch {
    return null
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) return null

  return { ...session.user, sessionId: session.id }
}

/** Delete a session from the DB by its token */
export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } }).catch(() => {})
}

/** Remove expired OTP codes and sessions (cron cleanup) */
export async function cleanupExpired(): Promise<void> {
  const now = new Date()
  await Promise.all([
    prisma.otpCode.deleteMany({ where: { OR: [{ used: true }, { expiresAt: { lt: now } }] } }),
    prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
  ])
}
