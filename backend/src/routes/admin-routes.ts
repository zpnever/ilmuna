import { Router } from 'express'
import { z } from 'zod'

import { prisma } from '../lib/prisma.js'
import { mapGroup, mapPost, mapUser } from '../lib/serializers.js'
import { requireAdmin, requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

const adminRouter = Router()

adminRouter.use(requireAuth, requireAdmin)

adminRouter.get('/admin/stats', async (_req, res, next) => {
  try {
    const [usersCount, groupsCount, postsCount, commentsCount, pendingSubmissionsCount, unreadNotificationsCount] =
      await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.group.count(),
        prisma.post.count(),
        prisma.postComment.count(),
        prisma.groupTaskSubmission.count({ where: { status: 'PENDING' } }),
        prisma.notification.count({ where: { isRead: false } }),
      ])
    res.json({
      usersCount,
      groupsCount,
      postsCount,
      commentsCount,
      pendingSubmissionsCount,
      unreadNotificationsCount,
    })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/admin/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
    res.json(
      users.map((user) => ({
        ...mapUser(user),
        isBanned: user.isBanned,
        deletedAt: user.deletedAt?.toISOString() ?? null,
      })),
    )
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/admin/users/:userId/ban-toggle', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = String(req.params.userId)
    const input = z.object({ isBanned: z.boolean() }).parse(req.body)
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: input.isBanned },
    })
    res.json({ ...mapUser(user), isBanned: user.isBanned })
  } catch (error) {
    next(error)
  }
})

adminRouter.delete('/admin/users/:userId', async (req, res, next) => {
  try {
    const userId = String(req.params.userId)
    const user = await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    })
    res.json({ ...mapUser(user), deletedAt: user.deletedAt?.toISOString() ?? null })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/admin/groups', async (_req, res, next) => {
  try {
    const groups = await prisma.group.findMany({
      orderBy: { createdAt: 'desc' },
      include: { members: true },
    })
    res.json(groups.map((group) => ({ ...mapGroup(group), membersCount: group.members.length })))
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/admin/reports', async (_req, res, next) => {
  try {
    const reports = await prisma.postReport.findMany({
      include: {
        reporter: true,
        post: {
          include: {
            author: true,
            reactions: true,
            comments: true,
            reports: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(
      reports.map((report) => ({
        id: report.id,
        reason: report.reason,
        status: report.status.toLowerCase(),
        moderatorNote: report.moderatorNote,
        createdAt: report.createdAt.toISOString(),
        reporter: mapUser(report.reporter),
        post: mapPost(report.post),
      })),
    )
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/admin/reports/:reportId/action', async (req: AuthenticatedRequest, res, next) => {
  try {
    const reportId = String(req.params.reportId)
    const input = z.object({
      action: z.enum(['take-down', 'restore', 'dismiss']),
      note: z.string().default(''),
    }).parse(req.body)
    const report = await prisma.postReport.findUniqueOrThrow({
      where: { id: reportId },
    })

    if (input.action === 'take-down') {
      await prisma.post.update({
        where: { id: report.postId },
        data: {
          isHidden: true,
          hiddenReason: input.note || report.reason,
        },
      })
      await prisma.postReport.update({
        where: { id: report.id },
        data: {
          status: 'TAKEN_DOWN',
          moderatorId: req.auth!.userId,
          moderatorNote: input.note,
        },
      })
    } else if (input.action === 'restore') {
      await prisma.post.update({
        where: { id: report.postId },
        data: {
          isHidden: false,
          hiddenReason: '',
        },
      })
      await prisma.postReport.update({
        where: { id: report.id },
        data: {
          status: 'DISMISSED',
          moderatorId: req.auth!.userId,
          moderatorNote: input.note,
        },
      })
    } else {
      await prisma.postReport.update({
        where: { id: report.id },
        data: {
          status: 'DISMISSED',
          moderatorId: req.auth!.userId,
          moderatorNote: input.note,
        },
      })
    }
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

export { adminRouter }
