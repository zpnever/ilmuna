import { apiRequest } from '@/lib/api'
import type { NotificationItem } from '@/types/domain'

export async function getNotifications(_userId: string) {
  return apiRequest<NotificationItem[]>('/notifications')
}

export async function markNotificationRead(notificationId: string) {
  return apiRequest<{ ok: true }>(`/notifications/${notificationId}/read`, {
    method: 'POST',
  })
}
