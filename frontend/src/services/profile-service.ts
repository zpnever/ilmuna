import { apiRequest } from '@/lib/api'
import type { FeedPost } from '@/services/post-service'
import type { Profile, User } from '@/types/domain'

interface ProfilePayload {
  profile: Profile
  posts: FeedPost[]
}

export async function getProfile(username: string, _viewerId: string | null) {
  return apiRequest<ProfilePayload>(`/profiles/${username}`)
}

export async function toggleFollow(_viewerId: string, targetUserId: string) {
  return apiRequest<ProfilePayload>(`/profiles/${targetUserId}/follow`, {
    method: 'POST',
  })
}

export async function getSuggestedProfiles(_viewerId: string) {
  return apiRequest<Profile[]>('/profiles/suggestions')
}

export async function updateMyProfile(input: Partial<User>) {
  const payload = await apiRequest<{ user: User }>('/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return payload.user
}
