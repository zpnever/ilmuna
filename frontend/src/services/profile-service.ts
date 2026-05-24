import { delay, makeId } from '@/lib/utils'
import { readDatabase, updateDatabase } from '@/lib/storage'
import type { FollowRelation, Post, Profile } from '@/types/domain'

function profileFromUser(username: string, viewerId: string | null) {
  const database = readDatabase()
  const user = database.users.find((entry) => entry.username === username)

  if (!user) {
    throw new Error('Profil tidak ditemukan.')
  }

  const followersCount = database.follows.filter((entry) => entry.followingId === user.id).length
  const followingCount = database.follows.filter((entry) => entry.followerId === user.id).length
  const postsCount = database.posts.filter((entry) => entry.authorId === user.id).length
  const isFollowedByViewer = viewerId
    ? database.follows.some(
        (entry) => entry.followerId === viewerId && entry.followingId === user.id,
      )
    : false

  const profile: Profile = {
    ...user,
    followersCount,
    followingCount,
    postsCount,
    isFollowedByViewer,
  }

  const posts = database.posts.filter((entry) => entry.authorId === user.id)

  return { profile, posts }
}

export async function getProfile(username: string, viewerId: string | null) {
  return delay(profileFromUser(username, viewerId), 250)
}

export async function toggleFollow(viewerId: string, targetUserId: string) {
  const database = updateDatabase((draft) => {
    const existingIndex = draft.follows.findIndex(
      (entry) => entry.followerId === viewerId && entry.followingId === targetUserId,
    )

    if (existingIndex >= 0) {
      draft.follows.splice(existingIndex, 1)
      return {
        ...draft,
        follows: [...draft.follows],
      }
    }

    const nextFollow: FollowRelation = {
      id: makeId('follow'),
      followerId: viewerId,
      followingId: targetUserId,
      createdAt: new Date().toISOString(),
    }

    return {
      ...draft,
      follows: [...draft.follows, nextFollow],
    }
  })

  const targetUser = database.users.find((entry) => entry.id === targetUserId)
  if (!targetUser) {
    throw new Error('Pengguna target tidak ditemukan.')
  }

  return delay(profileFromUser(targetUser.username, viewerId), 100)
}

export async function getSuggestedProfiles(viewerId: string) {
  const database = readDatabase()
  const followedIds = new Set(
    database.follows
      .filter((entry) => entry.followerId === viewerId)
      .map((entry) => entry.followingId),
  )

  const suggestions = database.users
    .filter((entry) => entry.id !== viewerId && !followedIds.has(entry.id))
    .map((entry) => profileFromUser(entry.username, viewerId).profile)
    .slice(0, 4)

  return delay(suggestions, 180)
}

export function getProfilePosts(username: string): Post[] {
  return profileFromUser(username, null).posts
}
