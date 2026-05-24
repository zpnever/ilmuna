import { readDatabase, updateDatabase } from '@/lib/storage'
import { delay } from '@/lib/utils'

export async function getNotifications(userId: string) {
  const notifications = readDatabase()
    .notifications.filter((entry) => entry.userId === userId)
    .sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt))

  return delay(notifications, 120)
}

export async function markNotificationRead(notificationId: string) {
  updateDatabase((draft) => ({
    ...draft,
    notifications: draft.notifications.map((entry) =>
      entry.id === notificationId
        ? {
            ...entry,
            isRead: true,
          }
        : entry,
    ),
  }))

  return delay(true, 80)
}
