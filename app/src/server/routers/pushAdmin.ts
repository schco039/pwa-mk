import { z } from 'zod'
import { router, comiteProcedure } from '../trpc'
import { getPushSettings } from '@/lib/push'

export const pushAdminRouter = router({
  getSettings: comiteProcedure.query(() => getPushSettings()),

  updateSettings: comiteProcedure
    .input(z.object({
      training24h:  z.boolean().optional(),
      training2h:   z.boolean().optional(),
      game24h:      z.boolean().optional(),
      eventMessage: z.boolean().optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.pushSetting.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', ...input },
        update: input,
      })
    ),

  getLogs: comiteProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(({ ctx, input }) =>
      ctx.prisma.pushLog.findMany({
        orderBy: { sentAt: 'desc' },
        take: input.limit,
      })
    ),
})
