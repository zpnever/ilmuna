import { readDatabase, updateDatabase } from '@/lib/storage'
import { delay, makeId, seededShuffle } from '@/lib/utils'
import type {
  CommentThread,
  Post,
  PostContentBlock,
  QuranQuoteBlock,
  SessionUser,
} from '@/types/domain'

export interface FeedPost extends Post {
  authorName: string
  authorUsername: string
  authorAvatar: string
  commentCount: number
  engagementScore: number
  isHidden: boolean
}

function withAuthor(post: Post): FeedPost {
  const database = readDatabase()
  const author = database.users.find((entry) => entry.id === post.authorId)
  const comments = database.comments.filter((entry) => entry.postId === post.id)
  const moderation = database.moderation.find((entry) => entry.postId === post.id)
  const authorFollowers = database.follows.filter((entry) => entry.followingId === post.authorId).length
  const engagementScore =
    post.likeUserIds.length * 2 +
    comments.length * 3 +
    post.shareCount +
    authorFollowers -
    post.dislikeUserIds.length

  return {
    ...post,
    authorName: author?.name ?? 'Unknown',
    authorUsername: author?.username ?? 'unknown',
    authorAvatar: author?.avatarUrl ?? '',
    commentCount: comments.length,
    engagementScore,
    isHidden: moderation?.status === 'hidden',
  }
}

function visiblePosts() {
  return readDatabase()
    .posts.map(withAuthor)
    .filter((entry) => !entry.isHidden)
}

export async function getFollowingFeed(userId: string) {
  const database = readDatabase()
  const followedIds = new Set(
    database.follows
      .filter((entry) => entry.followerId === userId)
      .map((entry) => entry.followingId),
  )

  const feed = visiblePosts()
    .filter((entry) => followedIds.has(entry.authorId))
    .sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt))

  return delay(feed, 250)
}

export async function getExplorePopularPosts() {
  const posts = visiblePosts().sort((left, right) => right.engagementScore - left.engagementScore)
  return delay(posts, 250)
}

export async function getExploreForYouPosts(user: SessionUser) {
  const posts = visiblePosts()
    .map((entry) => {
      const tagScore = entry.tags.filter((tag) => user.interests.includes(tag)).length
      return {
        ...entry,
        personalizedScore: entry.engagementScore + tagScore * 5,
      }
    })
    .sort((left, right) => right.personalizedScore - left.personalizedScore)

  return delay(posts, 250)
}

export async function getExploreRandomPosts() {
  const posts = seededShuffle(visiblePosts(), 31)
  return delay(posts, 250)
}

export async function getExplorePosts(user: SessionUser) {
  const [popular, forYou, random] = await Promise.all([
    getExplorePopularPosts(),
    getExploreForYouPosts(user),
    getExploreRandomPosts(),
  ])

  return {
    popular,
    forYou,
    random,
  }
}

export async function createPost(input: {
  authorId: string
  html: string
  images: string[]
  tags: string[]
  quranQuote?: QuranQuoteBlock | null
}) {
  const blocks: PostContentBlock[] = [
    {
      type: 'richText',
      html: input.html,
    },
  ]

  if (input.quranQuote) {
    blocks.push(input.quranQuote)
  }

  if (input.images.length) {
    blocks.push({
      type: 'images',
      images: input.images,
    })
  }

  const post: Post = {
    id: makeId('post'),
    authorId: input.authorId,
    content: blocks,
    images: input.images,
    visibility: 'public',
    tags: input.tags,
    createdAt: new Date().toISOString(),
    likeUserIds: [],
    dislikeUserIds: [],
    shareCount: 0,
  }

  updateDatabase((draft) => ({
    ...draft,
    posts: [post, ...draft.posts],
    moderation: [
      {
        postId: post.id,
        status: 'visible',
        reason: '',
        updatedAt: post.createdAt,
      },
      ...draft.moderation,
    ],
  }))

  return delay(withAuthor(post), 150)
}

export async function toggleReaction(postId: string, userId: string, type: 'like' | 'dislike') {
  updateDatabase((draft) => {
    const posts = draft.posts.map((post) => {
      if (post.id !== postId) {
        return post
      }

      const likeSet = new Set(post.likeUserIds)
      const dislikeSet = new Set(post.dislikeUserIds)

      if (type === 'like') {
        if (likeSet.has(userId)) {
          likeSet.delete(userId)
        } else {
          likeSet.add(userId)
          dislikeSet.delete(userId)
        }
      } else {
        if (dislikeSet.has(userId)) {
          dislikeSet.delete(userId)
        } else {
          dislikeSet.add(userId)
          likeSet.delete(userId)
        }
      }

      return {
        ...post,
        likeUserIds: [...likeSet],
        dislikeUserIds: [...dislikeSet],
      }
    })

    return {
      ...draft,
      posts,
    }
  })

  return delay(true, 100)
}

export async function addComment(postId: string, authorId: string, content: string, parentId: string | null) {
  const comment: CommentThread = {
    id: makeId('comment'),
    postId,
    authorId,
    parentId,
    content,
    createdAt: new Date().toISOString(),
  }

  updateDatabase((draft) => ({
    ...draft,
    comments: [comment, ...draft.comments],
  }))

  return delay(comment, 100)
}

export async function sharePost(postId: string) {
  updateDatabase((draft) => ({
    ...draft,
    posts: draft.posts.map((post) =>
      post.id === postId
        ? {
            ...post,
            shareCount: post.shareCount + 1,
          }
        : post,
    ),
  }))

  return delay(true, 80)
}

export async function getComments(postId: string) {
  const database = readDatabase()
  const comments = database.comments
    .filter((entry) => entry.postId === postId)
    .sort((left, right) => +new Date(left.createdAt) - +new Date(right.createdAt))

  return delay(comments, 120)
}
