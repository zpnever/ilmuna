import { apiRequest } from '@/lib/api'
import type {
  CommentThread,
  Post,
  PostContentBlock,
} from '@/types/domain'

export interface FeedPost extends Post {
  authorName: string
  authorUsername: string
  authorAvatar: string
  commentCount: number
  engagementScore: number
  isHidden: boolean
  reportCount: number
}

interface CreatePostInput {
  blocks: PostContentBlock[]
  images: string[]
  tags: string[]
}

interface ExplorePageResponse {
  mode: 'popular' | 'for-you' | 'random'
  items: FeedPost[]
  nextCursor: string | null
}

function normalizePost(post: FeedPost): FeedPost {
  return {
    ...post,
    content: (post.content ?? []) as PostContentBlock[],
    images: post.images ?? [],
    tags: post.tags ?? [],
    likeUserIds: post.likeUserIds ?? [],
    dislikeUserIds: post.dislikeUserIds ?? [],
  }
}

export async function getFollowingFeed() {
  const posts = await apiRequest<FeedPost[]>('/feed')
  return posts.map(normalizePost)
}

export async function getExplorePosts(
  mode: 'popular' | 'for-you' | 'random',
  limit = 5,
  cursor?: string | null,
) {
  const params = new URLSearchParams({
    mode,
    limit: String(limit),
  })
  if (cursor) {
    params.set('cursor', cursor)
  }

  const payload = await apiRequest<ExplorePageResponse>(`/explore?${params.toString()}`)
  return {
    ...payload,
    items: payload.items.map(normalizePost),
  }
}

export async function createPost(input: CreatePostInput) {
  const post = await apiRequest<FeedPost>('/posts', {
    method: 'POST',
    body: JSON.stringify({
      blocks: input.blocks,
      images: input.images,
      tags: input.tags,
    }),
  })

  return normalizePost(post)
}

export async function getComments(postId: string) {
  return apiRequest<CommentThread[]>(`/posts/${postId}/comments`)
}

export async function addComment(
  postId: string,
  _currentUserId: string,
  content: string,
  parentId: string | null,
) {
  return apiRequest<CommentThread>(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      content,
      parentId,
    }),
  })
}

export async function toggleReaction(
  postId: string,
  _currentUserId: string,
  type: 'like' | 'dislike',
) {
  return apiRequest<{ ok: true }>(`/posts/${postId}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ type }),
  })
}

export async function sharePost(postId: string) {
  return apiRequest<{ ok: true }>(`/posts/${postId}/share`, {
    method: 'POST',
  })
}

export async function getPostDetail(postId: string) {
  const post = await apiRequest<FeedPost>(`/posts/${postId}`)
  return normalizePost(post)
}

export async function reportPost(postId: string, reason: string) {
  return apiRequest<{ id: string }>(`/posts/${postId}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}
