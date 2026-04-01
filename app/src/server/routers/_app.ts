import { router } from '../trpc'
import { authRouter } from './auth'
import { eventsRouter } from './events'
import { rsvpRouter } from './rsvp'
import { attendanceRouter } from './attendance'
import { pushRouter } from './push'
import { teamsRouter } from './teams'
import { messagesRouter } from './messages'
import { absencesRouter } from './absences'

export const appRouter = router({
  auth: authRouter,
  events: eventsRouter,
  rsvp: rsvpRouter,
  attendance: attendanceRouter,
  push: pushRouter,
  teams: teamsRouter,
  messages: messagesRouter,
  absences: absencesRouter,
})

export type AppRouter = typeof appRouter
