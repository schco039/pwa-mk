import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, coachProcedure } from '../trpc'

const POSITIONS = ['QB', 'WR', 'RB', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P', 'ST']

export const rosterRouter = router({
  // Get roster for an event (all logged-in users can view)
  get: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.gameRoster.findMany({
        where: { eventId: input.eventId },
        include: { user: { select: { id: true, name: true, jerseyNumber: true } } },
        orderBy: [{ position: 'asc' }, { user: { jerseyNumber: 'asc' } }],
      })
    ),

  // Set roster entries (replaces all) — COMITE/COACH
  set: coachProcedure
    .input(
      z.object({
        eventId: z.string(),
        entries: z.array(
          z.object({
            userId: z.string(),
            position: z.string().optional(),
            jerseyNumber: z.number().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.gameRoster.deleteMany({ where: { eventId: input.eventId } })
      if (input.entries.length > 0) {
        await ctx.prisma.gameRoster.createMany({
          data: input.entries.map((e) => ({
            eventId: input.eventId,
            userId: e.userId,
            position: e.position ?? null,
            jerseyNumber: e.jerseyNumber ?? null,
          })),
        })
      }
      return { count: input.entries.length }
    }),

  // Update single entry position
  updateEntry: coachProcedure
    .input(z.object({ id: z.string(), position: z.string().nullable() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.gameRoster.update({
        where: { id: input.id },
        data: { position: input.position },
      })
    ),
})

export const mvpRouter = router({
  // Cast vote — only roster players can vote, once per event
  vote: protectedProcedure
    .input(z.object({ eventId: z.string(), nomineeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Must be on roster
      const onRoster = await ctx.prisma.gameRoster.findUnique({
        where: { eventId_userId: { eventId: input.eventId, userId: ctx.user.id } },
      })
      if (!onRoster) throw new TRPCError({ code: 'FORBIDDEN', message: 'Only roster players can vote' })
      // Can't vote for yourself
      if (input.nomineeId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: "Can't vote for yourself" })
      // Upsert (change vote)
      return ctx.prisma.mvpVote.upsert({
        where: { eventId_voterId: { eventId: input.eventId, voterId: ctx.user.id } },
        create: { eventId: input.eventId, voterId: ctx.user.id, nomineeId: input.nomineeId },
        update: { nomineeId: input.nomineeId },
      })
    }),

  // Get results — visible to all once event is in the past
  results: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const votes = await ctx.prisma.mvpVote.findMany({
        where: { eventId: input.eventId },
        include: {
          nominee: { select: { id: true, name: true, jerseyNumber: true } },
        },
      })
      // Tally
      const tally = new Map<string, { user: typeof votes[0]['nominee']; count: number }>()
      for (const v of votes) {
        const existing = tally.get(v.nomineeId)
        if (existing) existing.count++
        else tally.set(v.nomineeId, { user: v.nominee, count: 1 })
      }
      const myVote = votes.find((v) => v.voterId === ctx.user.id)
      return {
        results: [...tally.values()].sort((a, b) => b.count - a.count),
        myVoteNomineeId: myVote?.nomineeId ?? null,
        totalVotes: votes.length,
      }
    }),
})
