import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { type Context } from './context'

const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure

/** Requires a valid session cookie — throws UNAUTHORIZED otherwise */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { ...ctx, user: ctx.user } })
})

/** Requires COACH or COMITE role */
export const coachProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role === 'PLAYER') {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return next({ ctx })
})

/** Requires COMITE role */
export const comiteProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'COMITE') {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return next({ ctx })
})
