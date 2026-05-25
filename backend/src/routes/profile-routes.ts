import { Router } from 'express'
import { z } from 'zod'

import { HttpError } from '../lib/http-error.js'
import { prisma } from '../lib/prisma.js'
import { mapPost, mapUser } from '../lib/serializers.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

const profileRouter = Router()

async function getProfilePayload(username: string, viewerId: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      posts: {
        where: { isHidden: false },
        include: {
          author: true,
          reactions: true,
          comments: true,
          reports: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!user) {
    throw new HttpError(404, 'Profil tidak ditemukan.')
  }

  const [followersCount, followingCount, isFollowedByViewer] = await Promise.all([
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.follow.count({ where: { followerId: user.id } }),
    prisma.follow.findFirst({
      where: { followerId: viewerId, followingId: user.id },
      select: { id: true },
    }),
  ])

  return {
    profile: {
      ...mapUser(user),
      followersCount,
      followingCount,
      postsCount: user.posts.length,
      isFollowedByViewer: Boolean(isFollowedByViewer),
    },
    posts: user.posts.map(mapPost),
  }
}

profileRouter.get('/profiles/suggestions', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const viewerId = req.auth!.userId
    const follows = await prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    })
    const excluded = [viewerId, ...follows.map((entry) => entry.followingId)]
    const users = await prisma.user.findMany({
      where: {
        id: { notIn: excluded },
        deletedAt: null,
      },
      take: 4,
      orderBy: { createdAt: 'desc' },
    })

    const payload = await Promise.all(
      users.map(async (user) => {
        const followersCount = await prisma.follow.count({ where: { followingId: user.id } })
        const followingCount = await prisma.follow.count({ where: { followerId: user.id } })
        const postsCount = await prisma.post.count({ where: { authorId: user.id, isHidden: false } })
        return {
          ...mapUser(user),
          followersCount,
          followingCount,
          postsCount,
          isFollowedByViewer: false,
        }
      }),
    )
    res.json(payload)
  } catch (error) {
    next(error)
  }
})

profileRouter.get('/profiles/:username', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(await getProfilePayload(String(req.params.username), req.auth!.userId))
  } catch (error) {
    next(error)
  }
})

profileRouter.post('/profiles/:userId/follow', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const viewerId = req.auth!.userId
    const targetUserId = String(req.params.userId)
    const existing = await prisma.follow.findFirst({
      where: { followerId: viewerId, followingId: targetUserId },
    })

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } })
    } else {
      await prisma.follow.create({
        data: {
          followerId: viewerId,
          followingId: targetUserId,
        },
      })
    }

    const target = await prisma.user.findUniqueOrThrow({
      where: { id: targetUserId },
      select: { username: true },
    })
    res.json(await getProfilePayload(target.username, viewerId))
  } catch (error) {
    next(error)
  }
})

profileRouter.patch('/me/profile', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = z.object({
      bio: z.string().optional(),
      location: z.string().optional(),
      website: z.string().optional(),
      avatarUrl: z.string().optional(),
      coverUrl: z.string().optional(),
      interests: z.array(z.string()).optional(),
      name: z.string().min(2).optional(),
      username: z.string().min(3).regex(/^[a-z0-9-_.]+$/).optional(),
      isPrivate: z.boolean().optional(),
      notificationPreferences: z
        .object({
          email: z.boolean(),
          push: z.boolean(),
          group: z.boolean(),
        })
        .optional(),
    }).parse(req.body)

    const user = await prisma.user.update({
      where: { id: req.auth!.userId },
      data: input,
    })
    res.json({ user: mapUser(user) })
  } catch (error) {
    next(error)
  }
})

export { profileRouter }
