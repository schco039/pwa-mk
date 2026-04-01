import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { cookies } from 'next/headers'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { generateOtp, createSession, deleteSession } from '@/lib/auth'
import { findPahekoUserByEmail } from '@/lib/paheko'
import { sendOtpEmail } from '@/lib/email'

export const authRouter = router({
  /** Step 1: Request an OTP for a given email */
  requestOtp: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const { email } = input

      // 1. Check if user already exists locally (synced from Paheko or seeded)
      const existingUser = await ctx.prisma.user.findUnique({ where: { email } })

      // Always sync from Paheko to pick up role/jersey changes
      const pahekoUser = await findPahekoUserByEmail(email)

      if (!existingUser) {
        // 2. Not found locally — must exist in Paheko
        if (!pahekoUser) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Email not registered. Contact your team admin.',
          })
        }
        await ctx.prisma.user.create({
          data: {
            email,
            pahekoId: pahekoUser.pahekoId,
            name: pahekoUser.name,
            role: pahekoUser.role,
            phone: pahekoUser.phone,
            jerseyNumber: pahekoUser.jerseyNumber,
          },
        })
      } else if (pahekoUser) {
        // Sync role, jersey and name changes from Paheko on every login
        await ctx.prisma.user.update({
          where: { email },
          data: {
            name: pahekoUser.name,
            role: pahekoUser.role,
            phone: pahekoUser.phone,
            jerseyNumber: pahekoUser.jerseyNumber,
          },
        })
      }

      // 3. Invalidate any unused OTPs for this email
      await ctx.prisma.otpCode.updateMany({
        where: { email, used: false },
        data: { used: true },
      })

      // 4. Generate and store new OTP
      const code = generateOtp()
      const expiryMs = parseInt(process.env.OTP_EXPIRY_MINUTES ?? '10') * 60 * 1000
      await ctx.prisma.otpCode.create({
        data: { email, code, expiresAt: new Date(Date.now() + expiryMs) },
      })

      // 5. Send the OTP via email — fetch name from local DB
      const localUser = await ctx.prisma.user.findUnique({ where: { email } })
      await sendOtpEmail(email, localUser?.name ?? 'Player', code)

      return { sent: true }
    }),

  /** Step 2: Verify the OTP and create a session */
  verifyOtp: publicProcedure
    .input(z.object({ email: z.string().email(), code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const { email, code } = input

      const otp = await ctx.prisma.otpCode.findFirst({
        where: { email, code, used: false, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      })

      if (!otp) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired code. Please try again.',
        })
      }

      // Mark OTP as consumed (single-use)
      await ctx.prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } })

      const user = await ctx.prisma.user.findUnique({ where: { email } })
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found.' })
      }

      // Create JWT session
      const sessionDays = parseInt(process.env.SESSION_DAYS ?? '30')
      const token = await createSession(user.id, sessionDays)

      // Set httpOnly cookie
      const cookieStore = await cookies()
      cookieStore.set('knights_session', token, {
        httpOnly: true,
        secure: process.env.HTTPS_ENABLED === 'true',
        sameSite: 'lax',
        maxAge: sessionDays * 24 * 60 * 60,
        path: '/',
      })

      return {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      }
    }),

  /** Destroy the current session */
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.sessionToken) {
      await deleteSession(ctx.sessionToken)
    }
    const cookieStore = await cookies()
    cookieStore.delete('knights_session')
    return { success: true }
  }),

  /** Return the current authenticated user */
  me: protectedProcedure.query(({ ctx }) => ({
    id: ctx.user.id,
    name: ctx.user.name,
    email: ctx.user.email,
    role: ctx.user.role,
    jerseyNumber: ctx.user.jerseyNumber,
    position: ctx.user.position,
    avatarUrl: ctx.user.avatarUrl,
  })),
})
