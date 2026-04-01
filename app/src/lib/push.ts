import webpush from 'web-push'
import { prisma } from './prisma'

function getWebPush() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    throw new Error('VAPID keys not configured')
  }
  webpush.setVapidDetails(
    `mailto:${process.env.SMTP_USER ?? 'noreply@mamerknights.lu'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
  return webpush
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

/** Send a push notification to a single user (all their subscriptions) */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  await sendPushToSubscriptions(subs, payload)
}

/** Send a push notification to all users with a given role (or all roles) */
export async function sendPushBroadcast(
  payload: PushPayload,
  roles?: ('PLAYER' | 'COACH' | 'COMITE')[],
) {
  const subs = await prisma.pushSubscription.findMany({
    where: roles ? { user: { role: { in: roles } } } : undefined,
  })
  await sendPushToSubscriptions(subs, payload)
}

async function sendPushToSubscriptions(
  subs: { endpoint: string; p256dh: string; auth: string; id: string }[],
  payload: PushPayload,
) {
  const wp = getWebPush()
  const json = JSON.stringify(payload)
  const results = await Promise.allSettled(
    subs.map((sub) =>
      wp.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        json,
      ),
    ),
  )

  // Remove expired/invalid subscriptions (410 Gone)
  const expiredIds: string[] = []
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const err = result.reason as { statusCode?: number }
      if (err.statusCode === 410 || err.statusCode === 404) {
        expiredIds.push(subs[i].id)
      }
    }
  })
  if (expiredIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expiredIds } } })
  }
}
