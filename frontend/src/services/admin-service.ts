import { apiRequest } from '@/lib/api'
import type { AdminGroup, AdminReportItem, AdminStats, AdminUser } from '@/types/domain'

export async function getAdminStats(): Promise<AdminStats> {
  return apiRequest<AdminStats>('/admin/stats')
}

export async function getAdminUsers() {
  return apiRequest<AdminUser[]>('/admin/users')
}

export async function toggleBanUser(userId: string, isBanned: boolean) {
  return apiRequest<AdminUser>(`/admin/users/${userId}/ban-toggle`, {
    method: 'POST',
    body: JSON.stringify({ isBanned }),
  })
}

export async function deleteUser(userId: string) {
  return apiRequest<AdminUser>(`/admin/users/${userId}`, {
    method: 'DELETE',
  })
}

export async function getAdminGroups() {
  return apiRequest<AdminGroup[]>('/admin/groups')
}

export async function getModerationItems() {
  return apiRequest<AdminReportItem[]>('/admin/reports')
}

export async function moderateContent(
  reportId: string,
  action: 'take-down' | 'restore' | 'dismiss',
  note: string,
) {
  return apiRequest<{ ok: true }>(`/admin/reports/${reportId}/action`, {
    method: 'POST',
    body: JSON.stringify({ action, note }),
  })
}
