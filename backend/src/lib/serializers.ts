import type {
  Group,
  GroupMaterial,
  GroupMember,
  GroupPost,
  GroupPostComment,
  GroupPostReaction,
  Notification,
  Post,
  PostComment,
  PostReaction,
  PostReport,
  User,
} from '@prisma/client'

export function mapUser(
  user: Pick<
    User,
    | 'id'
    | 'username'
    | 'name'
    | 'email'
    | 'role'
    | 'bio'
    | 'location'
    | 'website'
    | 'avatarUrl'
    | 'coverUrl'
    | 'interests'
    | 'isPrivate'
    | 'themePreference'
    | 'notificationPreferences'
    | 'emailVerified'
    | 'isVerified'
    | 'createdAt'
  >,
) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role.toLowerCase(),
    bio: user.bio,
    location: user.location,
    website: user.website,
    avatarUrl: user.avatarUrl,
    coverUrl: user.coverUrl,
    interests: user.interests as string[],
    isPrivate: user.isPrivate,
    themePreference: user.themePreference === 'dark' ? 'dark' : 'light',
    notificationPreferences: user.notificationPreferences as {
      email: boolean
      push: boolean
      group: boolean
    },
    emailVerified: user.emailVerified,
    isVerified: user.isVerified,
    joinedAt: user.createdAt.toISOString(),
  }
}

export function mapPost(
  post: Post & {
    author: User
    reactions?: PostReaction[]
    comments?: PostComment[]
    reports?: PostReport[]
  },
) {
  const reactions = post.reactions ?? []
  const comments = post.comments ?? []
  return {
    id: post.id,
    authorId: post.authorId,
    content: (post.blocks as Array<Record<string, unknown>>) ?? [],
    images: (post.images as string[]) ?? [],
    visibility: post.visibility,
    tags: (post.tags as string[]) ?? [],
    createdAt: post.createdAt.toISOString(),
    likeUserIds: reactions.filter((entry) => entry.type === 'LIKE').map((entry) => entry.userId),
    dislikeUserIds: reactions
      .filter((entry) => entry.type === 'DISLIKE')
      .map((entry) => entry.userId),
    shareCount: post.shareCount,
    authorName: post.author.name,
    authorUsername: post.author.username,
    authorAvatar: post.author.avatarUrl,
    commentCount: comments.length,
    engagementScore:
      reactions.filter((entry) => entry.type === 'LIKE').length * 2 +
      comments.length * 3 +
      post.shareCount -
      reactions.filter((entry) => entry.type === 'DISLIKE').length,
    isHidden: post.isHidden,
    reportCount: post.reports?.length ?? 0,
  }
}

function mapFeedLikeMetrics(
  reactions: Array<{ type: 'LIKE' | 'DISLIKE'; userId: string }>,
  commentsCount: number,
  shareCount: number,
) {
  const likeUserIds = reactions.filter((entry) => entry.type === 'LIKE').map((entry) => entry.userId)
  const dislikeUserIds = reactions
    .filter((entry) => entry.type === 'DISLIKE')
    .map((entry) => entry.userId)

  return {
    likeUserIds,
    dislikeUserIds,
    shareCount,
    commentCount: commentsCount,
    engagementScore: likeUserIds.length * 2 + commentsCount * 3 + shareCount - dislikeUserIds.length,
  }
}

export function mapComment(comment: PostComment) {
  return {
    id: comment.id,
    postId: comment.postId,
    authorId: comment.authorId,
    parentId: comment.parentId,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
  }
}

export function mapCommentWithAuthor(comment: PostComment & { author: User }) {
  return {
    ...mapComment(comment),
    authorName: comment.author.name,
    authorUsername: comment.author.username,
    authorAvatar: comment.author.avatarUrl,
  }
}

export function mapNotification(notification: Notification & { actor?: User | null }) {
  return {
    id: notification.id,
    userId: notification.userId,
    actorId: notification.actorId,
    type: notification.type.toLowerCase(),
    message: notification.message,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
    actorName: notification.actor?.name ?? null,
  }
}

export function mapGroup(group: Group) {
  return {
    id: group.id,
    name: group.name,
    slug: group.slug,
    description: group.description,
    visibility: group.visibility.toLowerCase(),
    isPublic: group.visibility === 'PUBLIC',
    inviteCode: group.inviteCode,
    coverUrl: group.coverUrl,
    tags: group.tags,
    createdAt: group.createdAt.toISOString(),
  }
}

export function mapGroupMember(member: GroupMember & { user?: User }) {
  return {
    id: member.id,
    groupId: member.groupId,
    userId: member.userId,
    groupRole: member.groupRole.toLowerCase(),
    joinedAt: member.joinedAt.toISOString(),
    user: member.user ? mapUser(member.user) : undefined,
  }
}

export function mapGroupPost(post: GroupPost & { author: User }) {
  const metrics = mapFeedLikeMetrics([], 0, 'shareCount' in post ? post.shareCount : 0)

  return {
    id: post.id,
    groupId: post.groupId,
    authorId: post.authorId,
    content: (post.blocks as Array<Record<string, unknown>>) ?? [],
    images: (post.images as string[]) ?? [],
    authorName: post.author.name,
    authorUsername: post.author.username,
    authorAvatar: post.author.avatarUrl,
    createdAt: post.createdAt.toISOString(),
    ...metrics,
  }
}

export function mapGroupPostWithRelations(
  post: GroupPost & {
    author: User
    reactions?: GroupPostReaction[]
    comments?: GroupPostComment[]
  },
) {
  const metrics = mapFeedLikeMetrics(post.reactions ?? [], post.comments?.length ?? 0, post.shareCount)

  return {
    id: post.id,
    groupId: post.groupId,
    authorId: post.authorId,
    content: (post.blocks as Array<Record<string, unknown>>) ?? [],
    images: (post.images as string[]) ?? [],
    authorName: post.author.name,
    authorUsername: post.author.username,
    authorAvatar: post.author.avatarUrl,
    createdAt: post.createdAt.toISOString(),
    ...metrics,
  }
}

export function mapGroupCommentWithAuthor(comment: GroupPostComment & { author: User }) {
  return {
    id: comment.id,
    groupPostId: comment.groupPostId,
    authorId: comment.authorId,
    parentId: comment.parentId,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    authorName: comment.author.name,
    authorUsername: comment.author.username,
    authorAvatar: comment.author.avatarUrl,
  }
}

export function mapGroupMaterial(material: GroupMaterial) {
  const resourceUrl =
    material.resourceUrl && material.resourceUrl !== '#' ? material.resourceUrl : material.fileUrl ?? null

  return {
    id: material.id,
    groupId: material.groupId,
    uploaderId: material.uploaderId,
    title: material.title,
    description: material.description,
    type: material.type,
    resourceUrl,
    fileUrl: material.fileUrl ?? null,
    fileName: material.fileName ?? null,
    mimeType: material.mimeType ?? null,
    createdAt: material.createdAt.toISOString(),
  }
}
