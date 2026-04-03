import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, coachProcedure, protectedProcedure } from '../trpc'
import { sendPushToUser } from '@/lib/push'

export const messagesRouter = router({
  /** Send a message to all YES RSVPs of an event */
  send: coachProcedure
    .input(z.object({
      eventId: z.string(),
      body: z.string().min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.prisma.event.findUnique({
        where: { id: input.eventId },
        select: { id: true, title: true, type: true },
      })
      if (!event) throw new TRPCError({ code: 'NOT_FOUND' })

      // Save message
      const message = await ctx.prisma.eventMessage.create({
        data: {
          eventId: input.eventId,
          authorId: ctx.user.id,
          body: input.body,
        },
      })

      // Push to all YES RSVPs
      const yesRsvps = await ctx.prisma.rsvp.findMany({
        where: { eventId: input.eventId, status: 'YES' },
        select: { userId: true },
      })

      let pushed = 0
      for (const rsvp of yesRsvps) {
        if (rsvp.userId === ctx.user.id) continue // don't push to yourself
        await sendPushToUser(rsvp.userId, {
          title: `📣 ${event.title}`,
          body: input.body,
          url: `/schedule`,
          type: 'EVENT_MESSAGE',
          eventId: input.eventId,
        })
        pushed++
      }

      return { message, pushed }
    }),

  /** Get all messages for an event */
  list: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.eventMessage.findMany({
        where: { eventId: input.eventId },
        include: { author: { select: { name: true, role: true } } },
        orderBy: { sentAt: 'asc' },
      })
    }),
})
