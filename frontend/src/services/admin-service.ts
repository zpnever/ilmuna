import { readDatabase, updateDatabase } from '@/lib/storage'
import { delay } from '@/lib/utils'
import type { AdminStats } from '@/types/domain'

export async function getAdminStats(): Promise<AdminStats> {
  const database = readDatabase()
  return delay(
    {
      usersCount: database.users.length,
      groupsCount: database.groups.length,
      postsCount: database.posts.length,
      commentsCount: database.comments.length,
      pendingSubmissionsCount: database.submissions.filter((entry) => entry.status === 'pending').length,
      unreadNotificationsCount: database.notifications.filter((entry) => !entry.isRead).length,
    },
    140,
  )
}

export async function getAdminUsers() {
  return delay(readDatabase().users, 120)
}

export async function getAdminGroups() {
  const database = readDatabase()
  return delay(
    database.groups.map((group) => ({
      ...group,
      membersCount: database.groupMembers.filter((entry) => entry.groupId === group.id).length,
    })),
    120,
  )
}

export async function getModerationItems() {
  const database = readDatabase()
  return delay(
    database.moderation.map((item) => {
      const post = database.posts.find((entry) => entry.id === item.postId)
      const author = database.users.find((entry) => entry.id === post?.authorId)
      return {
        ...item,
        post,
        author,
      }
    }),
    140,
  )
}

export async function moderateContent(postId: string, status: 'visible' | 'hidden', reason: string) {
  updateDatabase((draft) => ({
    ...draft,
    moderation: draft.moderation.map((entry) =>
      entry.postId === postId
        ? {
            ...entry,
            status,
            reason,
            updatedAt: new Date().toISOString(),
          }
        : entry,
    ),
  }))

  return delay(true, 120)
}
