import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, coachProcedure } from '../trpc'

export const attendanceRouter = router({
  /** Record attendance for multiple players after an event (Coach+) */
  record: coachProcedure
    .input(
      z.object({
        eventId: z.string(),
        records: z.array(
          z.object({
            userId: z.string(),
            present: z.boolean(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.prisma.event.findUnique({ where: { id: input.eventId } })
      if (!event) throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found.' })

      const now = new Date()
      await Promise.all(
        input.records.map((rec) =>
          ctx.prisma.attendance.upsert({
            where: { userId_eventId: { userId: rec.userId, eventId: input.eventId } },
            create: {
              userId: rec.userId,
              eventId: input.eventId,
              present: rec.present,
              confirmedBy: ctx.user.id,
              confirmedAt: now,
            },
            update: {
              present: rec.present,
              confirmedBy: ctx.user.id,
              confirmedAt: now,
            },
          }),
        ),
      )

      return { updated: input.records.length }
    }),

  /** Get attendance records for an event (Coach+) */
  getForEvent: coachProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.attendance.findMany({
        where: { eventId: input.eventId },
        include: {
          user: { select: { id: true, name: true, jerseyNumber: true, position: true } },
        },
        orderBy: { user: { name: 'asc' } },
      })
    }),

  /** Personal attendance stats for the current player */
  myStats: protectedProcedure
    .input(
      z.object({
        months: z.number().int().min(1).max(12).default(3),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const months = input?.months ?? 3
      const since = new Date()
      since.setMonth(since.getMonth() - months)

      const records = await ctx.prisma.attendance.findMany({
        where: {
          userId: ctx.user.id,
          event: { date: { gte: since }, isTemplate: false },
        },
        include: { event: { select: { id: true, title: true, date: true, type: true } } },
        orderBy: { event: { date: 'desc' } },
      })

      const total = records.length
      const present = records.filter((r) => r.present).length
      const rate = total > 0 ? Math.round((present / total) * 100) : null

      return { records, total, present, rate, months }
    }),

  /** Team-wide attendance stats for a period (Coach+) */
  teamStats: coachProcedure
    .input(
      z.object({
        months: z.number().int().min(1).max(12).default(3),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const months = input?.months ?? 3
      const since = new Date()
      since.setMonth(since.getMonth() - months)

      const records = await ctx.prisma.attendance.findMany({
        where: { event: { date: { gte: since }, isTemplate: false } },
        include: {
          user: { select: { id: true, name: true, role: true, jerseyNumber: true } },
          event: { select: { id: true, title: true, date: true, type: true } },
        },
      })

      // Group by user
      const byUser = new Map<string, { user: (typeof records)[0]['user']; total: number; present: number }>()
      for (const rec of records) {
        const entry = byUser.get(rec.userId) ?? { user: rec.user, total: 0, present: 0 }
        entry.total++
        if (rec.present) entry.present++
        byUser.set(rec.userId, entry)
      }

      const players = Array.from(byUser.values())
        .map((p) => ({
          ...p,
          rate: p.total > 0 ? Math.round((p.present / p.total) * 100) : null,
        }))
        .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))

      return { players, months }
    }),
})
