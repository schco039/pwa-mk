import { z } from 'zod'
import { router, protectedProcedure, coachProcedure } from '../trpc'
import { sendPushBroadcast } from '@/lib/push'

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string(),
  auth: z.string(),
})

export const pushRouter = router({
  /** Save a push subscription for the current user */
  subscribe: protectedProcedure
    .input(subscriptionSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.pushSubscription.upsert({
        where: { endpoint: input.endpoint },
        create: { userId: ctx.user.id, ...input },
        update: { userId: ctx.user.id, p256dh: input.p256dh, auth: input.auth },
      })
      return { ok: true }
    }),

  /** Remove the push subscription */
  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.pushSubscription.deleteMany({
        where: { endpoint: input.endpoint, userId: ctx.user.id },
      })
      return { ok: true }
    }),

  /** Broadcast a custom push message (Coach+) */
  broadcast: coachProcedure
    .input(
      z.object({
        title: z.string().min(1),
        body: z.string().min(1),
        url: z.string().optional(),
        roles: z.array(z.enum(['PLAYER', 'COACH', 'COMITE'])).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await sendPushBroadcast(
        { title: input.title, body: input.body, url: input.url },
        input.roles as ('PLAYER' | 'COACH' | 'COMITE')[] | undefined,
      )
      return { ok: true }
    }),
})
