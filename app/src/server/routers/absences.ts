import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, coachProcedure } from '../trpc'

export const absencesRouter = router({
  /** Create an absence period for the current user */
  create: protectedProcedure
    .input(z.object({
      from: z.string(), // ISO date string
      to: z.string(),
      reason: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const from = new Date(input.from)
      const to = new Date(input.to)
      if (to < from) throw new TRPCError({ code: 'BAD_REQUEST', message: 'End date must be after start date' })
      return ctx.prisma.absence.create({
        data: { userId: ctx.user.id, from, to, reason: input.reason },
      })
    }),

  /** List own absences */
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.absence.findMany({
      where: { userId: ctx.user.id },
      orderBy: { from: 'asc' },
    })
  }),

  /** Delete own absence */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const absence = await ctx.prisma.absence.findUnique({ where: { id: input.id } })
      if (!absence || absence.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }
      await ctx.prisma.absence.delete({ where: { id: input.id } })
    }),

  /** For COACH/COMITE: get absent players for a specific event date */
  forEvent: coachProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.prisma.event.findUnique({
        where: { id: input.eventId },
        select: { date: true },
      })
      if (!event) throw new TRPCError({ code: 'NOT_FOUND' })

      const absences = await ctx.prisma.absence.findMany({
        where: {
          from: { lte: event.date },
          to: { gte: event.date },
          user: { role: 'PLAYER' },
        },
        include: { user: { select: { id: true, name: true, jerseyNumber: true } } },
        orderBy: { user: { name: 'asc' } },
      })

      return absences
    }),
})
