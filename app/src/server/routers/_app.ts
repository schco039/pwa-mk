import { router } from '../trpc'
import { authRouter } from './auth'
import { eventsRouter } from './events'
import { rsvpRouter } from './rsvp'
import { attendanceRouter } from './attendance'
import { pushRouter } from './push'
import { teamsRouter } from './teams'
import { messagesRouter } from './messages'
import { absencesRouter } from './absences'
import { documentsRouter } from './documents'
import { rosterRouter, mvpRouter } from './roster'
import { pushAdminRouter } from './pushAdmin'

export const appRouter = router({
  auth: authRouter,
  events: eventsRouter,
  rsvp: rsvpRouter,
  attendance: attendanceRouter,
  push: pushRouter,
  teams: teamsRouter,
  messages: messagesRouter,
  absences: absencesRouter,
  documents: documentsRouter,
  roster: rosterRouter,
  mvp: mvpRouter,
  pushAdmin: pushAdminRouter,
})

export type AppRouter = typeof appRouter
