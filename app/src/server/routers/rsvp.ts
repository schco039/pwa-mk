import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, coachProcedure } from '../trpc'
import { RsvpStatus } from '@prisma/client'

export const rsvpRouter = router({
  /** Set (upsert) the current user's RSVP for an event */
  set: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        status: z.nativeEnum(RsvpStatus),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.prisma.event.findUnique({ where: { id: input.eventId } })
      if (!event) throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found.' })

      return ctx.prisma.rsvp.upsert({
        where: { userId_eventId: { userId: ctx.user.id, eventId: input.eventId } },
        create: {
          userId: ctx.user.id,
          eventId: input.eventId,
          status: input.status,
          reason: input.reason ?? null,
        },
        update: {
          status: input.status,
          reason: input.reason ?? null,
        },
      })
    }),

  /** List all RSVPs for an event (Coach+) */
  listForEvent: coachProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const rsvps = await ctx.prisma.rsvp.findMany({
        where: { eventId: input.eventId },
        include: {
          user: {
            select: { id: true, name: true, role: true, jerseyNumber: true, position: true },
          },
        },
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      })

      const yes = rsvps.filter((r) => r.status === 'YES')
      const no = rsvps.filter((r) => r.status === 'NO')
      const maybe = rsvps.filter((r) => r.status === 'MAYBE')

      return { rsvps, yes, no, maybe }
    }),
})
