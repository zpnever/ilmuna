import { Router } from 'express'
import { ReactionType } from '@prisma/client'
import { z } from 'zod'

import { HttpError } from '../lib/http-error.js'
import { prisma } from '../lib/prisma.js'
import { mapComment, mapCommentWithAuthor, mapPost } from '../lib/serializers.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

const postRouter = Router()

const markdownBlockSchema = z.object({
  type: z.literal('markdown'),
  markdown: z.string(),
})

const quranQuoteBlockSchema = z.object({
  type: z.literal('quranQuote'),
  surahNumber: z.number(),
  ayahNumber: z.number(),
  surahName: z.string(),
  surahNameLatin: z.string(),
  arabic: z.string(),
  translation: z.string(),
})

const imageBlockSchema = z.object({
  type: z.literal('images'),
  images: z.array(z.string()),
})

const createPostSchema = z.object({
  blocks: z.array(z.union([markdownBlockSchema, quranQuoteBlockSchema, imageBlockSchema])).min(1),
  images: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
})

async function getVisiblePosts() {
  const posts = await prisma.post.findMany({
    where: { isHidden: false },
    include: {
      author: true,
      reactions: true,
      comments: true,
      reports: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return posts.map(mapPost)
}

function buildExploreRanking(
  mode: 'popular' | 'for-you' | 'random',
  posts: Awaited<ReturnType<typeof getVisiblePosts>>,
  interests: string[],
) {
  if (mode === 'popular') {
    return [...posts].sort((left, right) => right.engagementScore - left.engagementScore)
  }

  if (mode === 'for-you') {
    return [...posts].sort((left, right) => {
      const leftScore =
        left.tags.filter((tag) => interests.includes(tag)).length * 5 + left.engagementScore
      const rightScore =
        right.tags.filter((tag) => interests.includes(tag)).length * 5 + right.engagementScore
      return rightScore - leftScore
    })
  }

  return [...posts]
    .map((post) => ({
      post,
      score: post.engagementScore + Array.from(post.id).reduce((sum, char) => sum + char.charCodeAt(0), 0),
    }))
    .sort((left, right) => left.score - right.score)
    .map((entry) => entry.post)
}

postRouter.get('/feed', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const follows = await prisma.follow.findMany({
      where: { followerId: req.auth!.userId },
      select: { followingId: true },
    })
    const followedIds = follows.map((entry) => entry.followingId)
    const posts = await prisma.post.findMany({
      where: {
        authorId: { in: followedIds },
        isHidden: false,
      },
      include: {
        author: true,
        reactions: true,
        comments: true,
        reports: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(posts.map(mapPost))
  } catch (error) {
    next(error)
  }
})

postRouter.get('/explore', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const query = z.object({
      mode: z.enum(['popular', 'for-you', 'random']).default('popular'),
      limit: z.coerce.number().min(1).max(20).default(5),
      cursor: z.string().optional(),
    }).parse(req.query)
    const viewer = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.userId } })
    const posts = await getVisiblePosts()
    const sorted = buildExploreRanking(query.mode, posts, (viewer.interests as string[]) ?? [])
    const offset = Number(query.cursor ?? 0)
    const items = sorted.slice(offset, offset + query.limit)
    const nextCursor = offset + items.length < sorted.length ? String(offset + items.length) : null

    res.json({
      mode: query.mode,
      items,
      nextCursor,
    })
  } catch (error) {
    next(error)
  }
})

postRouter.get('/posts/:postId', requireAuth, async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: String(req.params.postId) },
      include: {
        author: true,
        reactions: true,
        comments: true,
        reports: true,
      },
    })
    if (!post || post.isHidden) {
      throw new HttpError(404, 'Postingan tidak ditemukan.')
    }
    res.json(mapPost(post))
  } catch (error) {
    next(error)
  }
})

postRouter.post('/posts', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = createPostSchema.parse(req.body)
    const post = await prisma.post.create({
      data: {
        authorId: req.auth!.userId,
        blocks: input.blocks,
        images: input.images,
        tags: input.tags,
      },
      include: {
        author: true,
        reactions: true,
        comments: true,
        reports: true,
      },
    })
    res.status(201).json(mapPost(post))
  } catch (error) {
    next(error)
  }
})

postRouter.get('/posts/:postId/comments', requireAuth, async (req, res, next) => {
  try {
    const postId = String(req.params.postId)
    const comments = await prisma.postComment.findMany({
      where: { postId },
      include: { author: true },
      orderBy: { createdAt: 'asc' },
    })
    res.json(comments.map(mapCommentWithAuthor))
  } catch (error) {
    next(error)
  }
})

postRouter.post('/posts/:postId/comments', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const postId = String(req.params.postId)
    const input = z.object({
      content: z.string().min(1),
      parentId: z.string().nullable().optional(),
    }).parse(req.body)

    if (input.parentId) {
      const parent = await prisma.postComment.findUnique({
        where: { id: input.parentId },
        select: { id: true, postId: true },
      })
      if (!parent || parent.postId !== postId) {
        throw new HttpError(400, 'Komentar induk tidak valid.')
      }
    }

    const comment = await prisma.postComment.create({
      data: {
        postId,
        authorId: req.auth!.userId,
        content: input.content,
        parentId: input.parentId ?? null,
      },
      include: {
        author: true,
      },
    })

    res.status(201).json(mapCommentWithAuthor(comment))
  } catch (error) {
    next(error)
  }
})

postRouter.post('/posts/:postId/reactions', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const postId = String(req.params.postId)
    const input = z.object({
      type: z.enum(['like', 'dislike']),
    }).parse(req.body)

    const existing = await prisma.postReaction.findFirst({
      where: {
        postId,
        userId: req.auth!.userId,
      },
    })

    if (existing && existing.type === input.type.toUpperCase()) {
      await prisma.postReaction.delete({ where: { id: existing.id } })
    } else if (existing) {
      await prisma.postReaction.update({
        where: { id: existing.id },
        data: { type: input.type === 'like' ? ReactionType.LIKE : ReactionType.DISLIKE },
      })
    } else {
      await prisma.postReaction.create({
        data: {
          postId,
          userId: req.auth!.userId,
          type: input.type === 'like' ? ReactionType.LIKE : ReactionType.DISLIKE,
        },
      })
    }

    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

postRouter.post('/posts/:postId/share', requireAuth, async (req, res, next) => {
  try {
    const postId = String(req.params.postId)
    await prisma.post.update({
      where: { id: postId },
      data: {
        shareCount: { increment: 1 },
      },
    })
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

postRouter.post('/posts/:postId/report', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const postId = String(req.params.postId)
    const input = z.object({
      reason: z.string().min(5),
    }).parse(req.body)

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    })
    if (!post) {
      throw new HttpError(404, 'Postingan tidak ditemukan.')
    }
    if (post.authorId === req.auth!.userId) {
      throw new HttpError(400, 'Anda tidak dapat melaporkan postingan sendiri.')
    }

    const existing = await prisma.postReport.findFirst({
      where: {
        postId,
        reporterId: req.auth!.userId,
      },
    })
    if (existing) {
      throw new HttpError(409, 'Postingan sudah pernah Anda laporkan.')
    }

    const report = await prisma.postReport.create({
      data: {
        postId,
        reporterId: req.auth!.userId,
        reason: input.reason,
      },
    })
    res.status(201).json(report)
  } catch (error) {
    next(error)
  }
})

export { postRouter }
