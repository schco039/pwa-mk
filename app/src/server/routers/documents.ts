import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, comiteProcedure } from '../trpc'
import { unlink } from 'fs/promises'
import { join } from 'path'

export const documentsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.document.findMany({ orderBy: { uploadedAt: 'desc' } })
  ),

  delete: comiteProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.prisma.document.findUnique({ where: { id: input.id } })
      if (!doc) throw new TRPCError({ code: 'NOT_FOUND' })
      // Delete file from disk
      const filePath = join(process.cwd(), '..', 'uploads', 'docs', doc.fileName)
      try { await unlink(filePath) } catch { /* already gone */ }
      await ctx.prisma.document.delete({ where: { id: input.id } })
    }),

  toggleDownloadable: comiteProcedure
    .input(z.object({ id: z.string(), downloadable: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.document.update({
        where: { id: input.id },
        data: { downloadable: input.downloadable },
      })
    ),
})
