import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, coachProcedure } from '../trpc'
import { EventType, EventStatus, HomeAway } from '@prisma/client'
import { addDays, addWeeks } from 'date-fns'

const eventCreateSchema = z.object({
  type: z.nativeEnum(EventType),
  title: z.string().min(1),
  date: z.string(), // ISO date string "2026-04-15"
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  location: z.string().optional(),
  opponent: z.string().optional(),
  opponentTeamId: z.string().optional(),
  homeAway: z.nativeEnum(HomeAway).optional(),
  notes: z.string().optional(),
  isPublic: z.boolean().default(true),
  isTemplate: z.boolean().default(false),
  allowMaybe: z.boolean().default(false),
})

const eventUpdateSchema = eventCreateSchema.partial().extend({
  scoreUs: z.number().int().optional(),
  scoreThem: z.number().int().optional(),
})

export const eventsRouter = router({
  /** List events — optionally filter by type / upcoming only */
  list: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(EventType).optional(),
        upcoming: z.boolean().optional(),
        past: z.boolean().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const where: Record<string, unknown> = {
        status: { not: EventStatus.CANCELLED },
        isTemplate: false,
      }
      if (input?.type) where.type = input.type
      if (input?.upcoming) where.date = { gte: now }
      if (input?.past) where.date = { lt: now }

      const events = await ctx.prisma.event.findMany({
        where,
        orderBy: { date: input?.past ? 'desc' : 'asc' },
        take: input?.limit ?? 50,
        include: {
          _count: { select: { rsvps: true, attendances: true } },
        },
      })

      // Attach current user's RSVP to each event
      const eventIds = events.map((e) => e.id)
      const myRsvps = await ctx.prisma.rsvp.findMany({
        where: { userId: ctx.user.id, eventId: { in: eventIds } },
      })
      const rsvpMap = Object.fromEntries(myRsvps.map((r) => [r.eventId, r]))

      return events.map((e) => ({ ...e, myRsvp: rsvpMap[e.id] ?? null }))
    }),

  /** Get a single event by ID */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.prisma.event.findUnique({
        where: { id: input.id },
        include: {
          rsvps: {
            include: { user: { select: { id: true, name: true, role: true, jerseyNumber: true } } },
            orderBy: { updatedAt: 'desc' },
          },
          attendances: {
            include: { user: { select: { id: true, name: true, jerseyNumber: true } } },
          },
        },
      })
      if (!event) throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found.' })

      const myRsvp = await ctx.prisma.rsvp.findUnique({
        where: { userId_eventId: { userId: ctx.user.id, eventId: input.id } },
      })
      return { ...event, myRsvp }
    }),

  /** Create a new event (Coach+) */
  create: coachProcedure
    .input(eventCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.event.create({
        data: {
          ...input,
          date: new Date(input.date),
        },
      })
    }),

  /** Update an event (Coach+) */
  update: coachProcedure
    .input(z.object({ id: z.string() }).merge(eventUpdateSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, date, ...rest } = input
      const event = await ctx.prisma.event.findUnique({ where: { id } })
      if (!event) throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found.' })

      return ctx.prisma.event.update({
        where: { id },
        data: {
          ...rest,
          ...(date ? { date: new Date(date) } : {}),
        },
      })
    }),

  /** Cancel an event (Coach+) */
  cancel: coachProcedure
    .input(z.object({ id: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.prisma.event.findUnique({ where: { id: input.id } })
      if (!event) throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found.' })

      return ctx.prisma.event.update({
        where: { id: input.id },
        data: { status: EventStatus.CANCELLED, cancelReason: input.reason ?? null },
      })
    }),

  /** Generate recurring training sessions from a template (Coach+) */
  generateRecurring: coachProcedure
    .input(
      z.object({
        templateId: z.string(),
        weeks: z.number().int().min(1).max(52),
        startDate: z.string(), // ISO date "2026-04-07"
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.prisma.event.findUnique({ where: { id: input.templateId } })
      if (!template || !template.isTemplate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found.' })
      }

      const created = []
      for (let i = 0; i < input.weeks; i++) {
        const date = addWeeks(new Date(input.startDate), i)
        // Skip if event already exists on this date for this template
        const existing = await ctx.prisma.event.findFirst({
          where: { templateId: input.templateId, date },
        })
        if (existing) continue

        const event = await ctx.prisma.event.create({
          data: {
            type: template.type,
            title: template.title,
            date,
            startTime: template.startTime,
            endTime: template.endTime ?? undefined,
            location: template.location ?? undefined,
            notes: template.notes ?? undefined,
            isPublic: template.isPublic,
            isTemplate: false,
            templateId: template.id,
          },
        })
        created.push(event)
      }

      return { created: created.length }
    }),

  /** Next upcoming event by type */
  next: protectedProcedure
    .input(z.object({ type: z.nativeEnum(EventType).optional() }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.prisma.event.findFirst({
        where: {
          date: { gte: new Date() },
          status: EventStatus.ACTIVE,
          isTemplate: false,
          ...(input?.type ? { type: input.type } : {}),
        },
        orderBy: { date: 'asc' },
      })
      if (!event) return null

      const myRsvp = await ctx.prisma.rsvp.findUnique({
        where: { userId_eventId: { userId: ctx.user.id, eventId: event.id } },
      })
      return { ...event, myRsvp }
    }),
})
