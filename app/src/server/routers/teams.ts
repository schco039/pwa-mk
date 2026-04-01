import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, coachProcedure } from '../trpc'

export const teamsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.team.findMany({ orderBy: { name: 'asc' } }),
  ),

  create: coachProcedure
    .input(
      z.object({
        name: z.string().min(1),
        shortName: z.string().optional(),
        location: z.string().optional(),
        logoUrl: z.string().url().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) => ctx.prisma.team.create({ data: input })),

  update: coachProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        shortName: z.string().optional(),
        location: z.string().optional(),
        logoUrl: z.string().url().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const team = await ctx.prisma.team.findUnique({ where: { id } })
      if (!team) throw new TRPCError({ code: 'NOT_FOUND' })
      return ctx.prisma.team.update({ where: { id }, data })
    }),

  delete: coachProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.team.delete({ where: { id: input.id } })
      return { ok: true }
    }),
})
