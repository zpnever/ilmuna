import crypto from 'node:crypto'
import { GroupRole, GroupVisibility, JoinRequestStatus, SubmissionStatus } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'

import { HttpError } from '../lib/http-error.js'
import { prisma } from '../lib/prisma.js'
import { mapGroup, mapGroupMember, mapGroupPost, mapUser } from '../lib/serializers.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

const groupRouter = Router()
const groupInputSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
  description: z.string().min(10),
  visibility: z.enum(['public', 'private']),
  coverUrl: z.string().url().or(z.literal('')).default(''),
  tags: z.array(z.string()).default([]),
})

async function getMembership(groupId: string, userId: string) {
  return prisma.groupMember.findFirst({
    where: { groupId, userId },
  })
}

async function assertCanViewInternal(groupId: string, viewerId: string) {
  const group = await prisma.group.findUniqueOrThrow({ where: { id: groupId } })
  if (group.visibility === GroupVisibility.PUBLIC) {
    return group
  }
  const membership = await getMembership(group.id, viewerId)
  if (!membership) {
    throw new HttpError(403, 'Anda harus menjadi anggota group private.')
  }
  return group
}

async function assertManager(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
      groupRole: { in: [GroupRole.MODERATOR, GroupRole.ADMIN] },
    },
  })
  if (!membership) {
    throw new HttpError(403, 'Perlu moderator/admin group.')
  }
  return membership
}

async function assertTaskManager(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
      groupRole: { in: [GroupRole.MODERATOR, GroupRole.ADMIN, GroupRole.USTADZ] },
    },
  })
  if (!membership) {
    throw new HttpError(403, 'Perlu role pengelola materi/tugas.')
  }
  return membership
}

groupRouter.get('/groups', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const groups = await prisma.group.findMany({ orderBy: { createdAt: 'desc' } })
    const result = await Promise.all(
      groups.map(async (group) => {
        const membership = await getMembership(group.id, req.auth!.userId)
        const joinRequest = await prisma.groupJoinRequest.findFirst({
          where: { groupId: group.id, userId: req.auth!.userId },
          orderBy: { requestedAt: 'desc' },
        })
        return {
          ...mapGroup(group),
          membershipStatus: membership ? 'member' : 'non-member',
          joinRequestStatus: joinRequest?.status.toLowerCase() ?? null,
        }
      }),
    )
    res.json(result)
  } catch (error) {
    next(error)
  }
})

groupRouter.post('/groups', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = groupInputSchema.parse(req.body)
    const existing = await prisma.group.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    })
    if (existing) {
      throw new HttpError(409, 'Slug grup sudah dipakai.')
    }

    const group = await prisma.group.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        visibility: input.visibility === 'public' ? GroupVisibility.PUBLIC : GroupVisibility.PRIVATE,
        coverUrl: input.coverUrl,
        tags: input.tags,
        inviteCode: crypto.randomUUID().slice(0, 8).toUpperCase(),
        members: {
          create: {
            userId: req.auth!.userId,
            groupRole: GroupRole.MODERATOR,
          },
        },
      },
    })

    res.status(201).json({
      ...mapGroup(group),
      membershipStatus: 'member',
      joinRequestStatus: null,
    })
  } catch (error) {
    next(error)
  }
})

groupRouter.get('/groups/:slug', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const slug = String(req.params.slug)
    const group = await prisma.group.findUnique({
      where: { slug },
      include: {
        members: { include: { user: true } },
        posts: {
          include: { author: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!group) {
      throw new HttpError(404, 'Group tidak ditemukan.')
    }

    const membership = await getMembership(group.id, req.auth!.userId)
    const joinRequest = await prisma.groupJoinRequest.findFirst({
      where: { groupId: group.id, userId: req.auth!.userId },
      orderBy: { requestedAt: 'desc' },
    })

    const posts =
      group.visibility === GroupVisibility.PUBLIC || membership
        ? group.posts.map(mapGroupPost)
        : []

    res.json({
      group: {
        ...mapGroup(group),
        membershipStatus: membership ? 'member' : 'non-member',
        joinRequestStatus: joinRequest?.status.toLowerCase() ?? null,
        viewerRole: membership?.groupRole.toLowerCase() ?? null,
      },
      members: group.members.map(mapGroupMember),
      forumPosts: posts,
    })
  } catch (error) {
    next(error)
  }
})

groupRouter.patch('/groups/:slug', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const slug = String(req.params.slug)
    const input = groupInputSchema.partial().parse(req.body)
    const group = await prisma.group.findUniqueOrThrow({ where: { slug } })
    await assertManager(group.id, req.auth!.userId)

    if (input.slug && input.slug !== slug) {
      const existing = await prisma.group.findUnique({ where: { slug: input.slug }, select: { id: true } })
      if (existing) {
        throw new HttpError(409, 'Slug grup sudah dipakai.')
      }
    }

    const updated = await prisma.group.update({
      where: { id: group.id },
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        visibility:
          input.visibility == null
            ? undefined
            : input.visibility === 'public'
              ? GroupVisibility.PUBLIC
              : GroupVisibility.PRIVATE,
        coverUrl: input.coverUrl,
        tags: input.tags,
      },
    })

    res.json(mapGroup(updated))
  } catch (error) {
    next(error)
  }
})

groupRouter.post('/groups/:slug/join-requests', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const slug = String(req.params.slug)
    const group = await prisma.group.findUniqueOrThrow({ where: { slug } })
    if (group.visibility === GroupVisibility.PUBLIC) {
      const membership = await prisma.groupMember.upsert({
        where: {
          groupId_userId: {
            groupId: group.id,
            userId: req.auth!.userId,
          },
        },
        update: {},
        create: {
          groupId: group.id,
          userId: req.auth!.userId,
          groupRole: GroupRole.ANGGOTA,
        },
      })
      res.json({ status: 'approved', membershipId: membership.id })
      return
    }

    const request = await prisma.groupJoinRequest.upsert({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: req.auth!.userId,
        },
      },
      update: {
        status: JoinRequestStatus.PENDING,
        note: '',
        reviewedAt: null,
      },
      create: {
        groupId: group.id,
        userId: req.auth!.userId,
      },
    })
    res.status(201).json({ status: request.status.toLowerCase() })
  } catch (error) {
    next(error)
  }
})

groupRouter.get('/groups/:slug/join-requests', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const slug = String(req.params.slug)
    const group = await prisma.group.findUniqueOrThrow({ where: { slug } })
    await assertManager(group.id, req.auth!.userId)

    const requests = await prisma.groupJoinRequest.findMany({
      where: { groupId: group.id, status: JoinRequestStatus.PENDING },
      include: { user: true },
      orderBy: { requestedAt: 'asc' },
    })

    res.json(
      requests.map((request) => ({
        id: request.id,
        groupId: request.groupId,
        userId: request.userId,
        status: request.status.toLowerCase(),
        requestedAt: request.requestedAt.toISOString(),
        reviewedAt: request.reviewedAt?.toISOString() ?? null,
        note: request.note,
        user: mapUser(request.user),
      })),
    )
  } catch (error) {
    next(error)
  }
})

groupRouter.post('/groups/:slug/join-requests/:requestId/review', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const slug = String(req.params.slug)
    const requestId = String(req.params.requestId)
    const input = z.object({
      status: z.enum(['approved', 'rejected']),
      note: z.string().default(''),
    }).parse(req.body)

    const group = await prisma.group.findUniqueOrThrow({ where: { slug } })
    await assertManager(group.id, req.auth!.userId)

    const request = await prisma.groupJoinRequest.update({
      where: { id: requestId },
      data: {
        status: input.status === 'approved' ? JoinRequestStatus.APPROVED : JoinRequestStatus.REJECTED,
        note: input.note,
        reviewedAt: new Date(),
      },
    })

    if (request.status === JoinRequestStatus.APPROVED) {
      await prisma.groupMember.upsert({
        where: {
          groupId_userId: {
            groupId: group.id,
            userId: request.userId,
          },
        },
        update: {},
        create: {
          groupId: group.id,
          userId: request.userId,
          groupRole: GroupRole.ANGGOTA,
        },
      })
    }

    res.json({ status: request.status.toLowerCase() })
  } catch (error) {
    next(error)
  }
})

groupRouter.post('/groups/:slug/members/:memberId/role', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const slug = String(req.params.slug)
    const memberId = String(req.params.memberId)
    const input = z.object({
      role: z.enum(['moderator', 'admin', 'ustadz', 'anggota']),
    }).parse(req.body)
    const group = await prisma.group.findUniqueOrThrow({ where: { slug } })
    const manager = await prisma.groupMember.findFirst({
      where: {
        groupId: group.id,
        userId: req.auth!.userId,
        groupRole: GroupRole.MODERATOR,
      },
    })
    if (!manager) {
      throw new HttpError(403, 'Hanya moderator yang bisa mengganti role anggota.')
    }
    const member = await prisma.groupMember.update({
      where: { id: memberId },
      data: { groupRole: input.role.toUpperCase() as GroupRole },
      include: { user: true },
    })
    res.json(mapGroupMember(member))
  } catch (error) {
    next(error)
  }
})

groupRouter.post('/groups/:slug/leave', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const slug = String(req.params.slug)
    const group = await prisma.group.findUniqueOrThrow({ where: { slug } })
    const membership = await prisma.groupMember.findFirst({
      where: { groupId: group.id, userId: req.auth!.userId },
    })
    if (!membership) {
      throw new HttpError(404, 'Anda bukan anggota grup ini.')
    }

    const moderatorsCount = await prisma.groupMember.count({
      where: { groupId: group.id, groupRole: GroupRole.MODERATOR },
    })
    if (membership.groupRole === GroupRole.MODERATOR && moderatorsCount === 1) {
      throw new HttpError(400, 'Moderator terakhir tidak bisa keluar sebelum menunjuk moderator lain.')
    }

    await prisma.groupMember.delete({ where: { id: membership.id } })
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

groupRouter.post('/groups/:slug/members/:memberId/kick', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const slug = String(req.params.slug)
    const memberId = String(req.params.memberId)
    const group = await prisma.group.findUniqueOrThrow({ where: { slug } })
    const actor = await assertManager(group.id, req.auth!.userId)
    const member = await prisma.groupMember.findUniqueOrThrow({ where: { id: memberId } })

    if (member.groupId !== group.id) {
      throw new HttpError(404, 'Anggota grup tidak ditemukan.')
    }
    if (member.groupRole === GroupRole.MODERATOR && actor.groupRole !== GroupRole.MODERATOR) {
      throw new HttpError(403, 'Hanya moderator yang bisa mengeluarkan moderator.')
    }
    if (member.userId === req.auth!.userId) {
      throw new HttpError(400, 'Gunakan aksi keluar grup untuk akun Anda sendiri.')
    }

    await prisma.groupMember.delete({ where: { id: member.id } })
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

groupRouter.get('/groups/:slug/posts', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const slug = String(req.params.slug)
    const group = await prisma.group.findUniqueOrThrow({ where: { slug } })
    await assertCanViewInternal(group.id, req.auth!.userId)
    const posts = await prisma.groupPost.findMany({
      where: { groupId: group.id },
      include: { author: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(posts.map(mapGroupPost))
  } catch (error) {
    next(error)
  }
})

groupRouter.post('/groups/:slug/posts', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const slug = String(req.params.slug)
    const input = z.object({ content: z.string().min(1) }).parse(req.body)
    const group = await prisma.group.findUniqueOrThrow({ where: { slug } })
    await assertCanViewInternal(group.id, req.auth!.userId)
    const post = await prisma.groupPost.create({
      data: {
        groupId: group.id,
        authorId: req.auth!.userId,
        content: input.content,
      },
      include: { author: true },
    })
    res.status(201).json(mapGroupPost(post))
  } catch (error) {
    next(error)
  }
})

groupRouter.get('/groups/:slug/materials', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const slug = String(req.params.slug)
    const group = await prisma.group.findUniqueOrThrow({ where: { slug } })
    await assertCanViewInternal(group.id, req.auth!.userId)
    const materials = await prisma.groupMaterial.findMany({
      where: { groupId: group.id },
      orderBy: { createdAt: 'desc' },
    })
    res.json(materials.map((material) => ({ ...material, createdAt: material.createdAt.toISOString() })))
  } catch (error) {
    next(error)
  }
})

groupRouter.get('/groups/:slug/tasks', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const slug = String(req.params.slug)
    const group = await prisma.group.findUniqueOrThrow({ where: { slug } })
    await assertCanViewInternal(group.id, req.auth!.userId)
    const tasks = await prisma.groupTask.findMany({
      where: { groupId: group.id },
      orderBy: { createdAt: 'desc' },
    })
    res.json(tasks.map((task) => ({ ...task, createdAt: task.createdAt.toISOString(), dueDate: task.dueDate.toISOString() })))
  } catch (error) {
    next(error)
  }
})

groupRouter.get('/groups/:slug/tasks/:taskId', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const slug = String(req.params.slug)
    const taskId = String(req.params.taskId)
    const group = await prisma.group.findUniqueOrThrow({ where: { slug } })
    await assertCanViewInternal(group.id, req.auth!.userId)

    const membership = await getMembership(group.id, req.auth!.userId)
    const task = await prisma.groupTask.findUniqueOrThrow({
      where: { id: taskId },
    })

    const submissions = await prisma.groupTaskSubmission.findMany({
      where:
        membership?.groupRole === GroupRole.ANGGOTA
          ? {
              taskId: task.id,
              userId: req.auth!.userId,
            }
          : { taskId: task.id },
      orderBy: { submittedAt: 'desc' },
    })

    res.json({
      group: mapGroup(group),
      task: {
        ...task,
        createdAt: task.createdAt.toISOString(),
        dueDate: task.dueDate.toISOString(),
      },
      submissions: submissions.map((submission) => ({
        ...submission,
        status: submission.status.toLowerCase(),
        submittedAt: submission.submittedAt.toISOString(),
      })),
    })
  } catch (error) {
    next(error)
  }
})

groupRouter.post('/groups/:slug/tasks/:taskId/submissions', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const slug = String(req.params.slug)
    const taskId = String(req.params.taskId)
    const input = z.object({ content: z.string().min(1) }).parse(req.body)
    const group = await prisma.group.findUniqueOrThrow({ where: { slug } })
    await assertCanViewInternal(group.id, req.auth!.userId)
    const submission = await prisma.groupTaskSubmission.upsert({
      where: {
        taskId_userId: {
          taskId,
          userId: req.auth!.userId,
        },
      },
      update: {
        content: input.content,
        status: SubmissionStatus.PENDING,
        note: '',
        submittedAt: new Date(),
      },
      create: {
        taskId,
        userId: req.auth!.userId,
        content: input.content,
      },
    })
    res.status(201).json({
      ...submission,
      status: submission.status.toLowerCase(),
      submittedAt: submission.submittedAt.toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

groupRouter.post('/groups/submissions/:submissionId/review', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const submissionId = String(req.params.submissionId)
    const input = z.object({
      status: z.enum(['accepted', 'revision']),
      note: z.string().default(''),
    }).parse(req.body)
    const submission = await prisma.groupTaskSubmission.findUniqueOrThrow({
      where: { id: submissionId },
      include: {
        task: true,
      },
    })
    await assertTaskManager(submission.task.groupId, req.auth!.userId)
    const updated = await prisma.groupTaskSubmission.update({
      where: { id: submission.id },
      data: {
        status: input.status === 'accepted' ? SubmissionStatus.ACCEPTED : SubmissionStatus.REVISION,
        note: input.note,
      },
    })
    res.json({
      ...updated,
      status: updated.status.toLowerCase(),
      submittedAt: updated.submittedAt.toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

export { groupRouter }
