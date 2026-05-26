import crypto from 'node:crypto'
import {
  GroupRole,
  GroupVisibility,
  JoinRequestStatus,
  ReactionType,
  SubmissionStatus,
} from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'

import { HttpError } from '../lib/http-error.js'
import { prisma } from '../lib/prisma.js'
import {
  mapGroup,
  mapGroupCommentWithAuthor,
  mapGroupMaterial,
  mapGroupMember,
  mapGroupPostWithRelations,
  mapUser,
} from '../lib/serializers.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

const groupRouter = Router()

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

const groupPostBlocksSchema = z
  .array(z.union([markdownBlockSchema, quranQuoteBlockSchema, imageBlockSchema]))
  .min(1)

const groupInputSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
  description: z.string().min(10),
  visibility: z.enum(['public', 'private']),
  coverUrl: z.string().default(''),
  tags: z.array(z.string()).default([]),
})

const groupMaterialSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  type: z.string().min(2),
  resourceUrl: z.string().url().optional().or(z.literal('')),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
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

async function assertMember(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
    },
  })
  if (!membership) {
    throw new HttpError(403, 'Anda harus menjadi anggota grup.')
  }
  return membership
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

function mapGroupPayload(group: {
  id: string
  slug: string
  name: string
  description: string
  visibility: GroupVisibility
  inviteCode: string
  coverUrl: string
  tags: unknown
  createdAt: Date
  updatedAt: Date
}, membershipStatus: 'member' | 'non-member', joinRequestStatus: string | null, viewerRole: string | null) {
  return {
    id: group.id,
    name: group.name,
    slug: group.slug,
    description: group.description,
    visibility: group.visibility.toLowerCase(),
    isPublic: group.visibility === GroupVisibility.PUBLIC,
    inviteCode: group.inviteCode,
    coverUrl: group.coverUrl,
    tags: (group.tags as string[]) ?? [],
    createdAt: group.createdAt.toISOString(),
    membershipStatus,
    joinRequestStatus,
    viewerRole,
  }
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

        return mapGroupPayload(
          group,
          membership ? 'member' : 'non-member',
          joinRequest?.status.toLowerCase() ?? null,
          membership?.groupRole.toLowerCase() ?? null,
        )
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

    res.status(201).json(mapGroupPayload(group, 'member', null, 'moderator'))
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
        members: {
          include: { user: true },
          orderBy: { joinedAt: 'asc' },
        },
        posts: {
          include: {
            author: true,
            reactions: true,
            comments: true,
          },
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
        ? group.posts.map(mapGroupPostWithRelations)
        : []

    res.json({
      group: mapGroupPayload(
        group,
        membership ? 'member' : 'non-member',
        joinRequest?.status.toLowerCase() ?? null,
        membership?.groupRole.toLowerCase() ?? null,
      ),
      members: group.members.map(mapGroupMember),
      forumPosts: posts,
    })
  } catch (error) {
    next(error)
  }
})

groupRouter.get('/groups/:slug/members', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const group = await prisma.group.findUniqueOrThrow({ where: { slug: String(req.params.slug) } })
    await assertCanViewInternal(group.id, req.auth!.userId)

    const members = await prisma.groupMember.findMany({
      where: { groupId: group.id },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    })

    res.json(members.map(mapGroupMember))
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
      const existing = await prisma.group.findUnique({
        where: { slug: input.slug },
        select: { id: true },
      })
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

    const membership = await assertMember(group.id, req.auth!.userId)
    res.json(
      mapGroupPayload(updated, 'member', null, membership.groupRole.toLowerCase()),
    )
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
    const group = await prisma.group.findUniqueOrThrow({ where: { slug: String(req.params.slug) } })
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
    const targetMember = await prisma.groupMember.findUniqueOrThrow({
      where: { id: memberId },
      select: { id: true, groupId: true, userId: true },
    })
    if (targetMember.groupId !== group.id) {
      throw new HttpError(404, 'Anggota grup tidak ditemukan.')
    }
    if (targetMember.userId === req.auth!.userId) {
      throw new HttpError(400, 'Anda tidak bisa mengubah role akun Anda sendiri.')
    }
    const member = await prisma.groupMember.update({
      where: { id: targetMember.id },
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
    const group = await prisma.group.findUniqueOrThrow({ where: { slug: String(req.params.slug) } })
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
    const group = await prisma.group.findUniqueOrThrow({ where: { slug: String(req.params.slug) } })
    await assertCanViewInternal(group.id, req.auth!.userId)
    const posts = await prisma.groupPost.findMany({
      where: { groupId: group.id },
      include: {
        author: true,
        reactions: true,
        comments: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(posts.map(mapGroupPostWithRelations))
  } catch (error) {
    next(error)
  }
})

groupRouter.post('/groups/:slug/posts', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const slug = String(req.params.slug)
    const input = z.object({
      blocks: groupPostBlocksSchema,
      images: z.array(z.string()).default([]),
    }).parse(req.body)
    const group = await prisma.group.findUniqueOrThrow({ where: { slug } })
    await assertMember(group.id, req.auth!.userId)

    const post = await prisma.groupPost.create({
      data: {
        groupId: group.id,
        authorId: req.auth!.userId,
        blocks: input.blocks,
        images: input.images,
      },
      include: {
        author: true,
        reactions: true,
        comments: true,
      },
    })
    res.status(201).json(mapGroupPostWithRelations(post))
  } catch (error) {
    next(error)
  }
})

groupRouter.get('/groups/:slug/posts/:postId/comments', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const group = await prisma.group.findUniqueOrThrow({ where: { slug: String(req.params.slug) } })
    const postId = String(req.params.postId)
    await assertCanViewInternal(group.id, req.auth!.userId)

    const post = await prisma.groupPost.findUnique({
      where: { id: postId },
      select: { id: true, groupId: true },
    })
    if (!post || post.groupId !== group.id) {
      throw new HttpError(404, 'Postingan grup tidak ditemukan.')
    }

    const comments = await prisma.groupPostComment.findMany({
      where: { groupPostId: postId },
      include: { author: true },
      orderBy: { createdAt: 'asc' },
    })

    res.json(comments.map(mapGroupCommentWithAuthor))
  } catch (error) {
    next(error)
  }
})

groupRouter.post('/groups/:slug/posts/:postId/comments', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const group = await prisma.group.findUniqueOrThrow({ where: { slug: String(req.params.slug) } })
    const postId = String(req.params.postId)
    const input = z.object({
      content: z.string().min(1),
      parentId: z.string().nullable().optional(),
    }).parse(req.body)
    await assertCanViewInternal(group.id, req.auth!.userId)
    await assertMember(group.id, req.auth!.userId)

    const post = await prisma.groupPost.findUnique({
      where: { id: postId },
      select: { id: true, groupId: true },
    })
    if (!post || post.groupId !== group.id) {
      throw new HttpError(404, 'Postingan grup tidak ditemukan.')
    }

    if (input.parentId) {
      const parent = await prisma.groupPostComment.findUnique({
        where: { id: input.parentId },
        select: { id: true, groupPostId: true },
      })
      if (!parent || parent.groupPostId !== postId) {
        throw new HttpError(400, 'Komentar induk tidak valid.')
      }
    }

    const comment = await prisma.groupPostComment.create({
      data: {
        groupPostId: postId,
        authorId: req.auth!.userId,
        content: input.content,
        parentId: input.parentId ?? null,
      },
      include: { author: true },
    })
    res.status(201).json(mapGroupCommentWithAuthor(comment))
  } catch (error) {
    next(error)
  }
})

groupRouter.post('/groups/:slug/posts/:postId/reactions', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const group = await prisma.group.findUniqueOrThrow({ where: { slug: String(req.params.slug) } })
    const postId = String(req.params.postId)
    const input = z.object({
      type: z.enum(['like', 'dislike']),
    }).parse(req.body)
    await assertCanViewInternal(group.id, req.auth!.userId)
    await assertMember(group.id, req.auth!.userId)

    const post = await prisma.groupPost.findUnique({
      where: { id: postId },
      select: { id: true, groupId: true },
    })
    if (!post || post.groupId !== group.id) {
      throw new HttpError(404, 'Postingan grup tidak ditemukan.')
    }

    const existing = await prisma.groupPostReaction.findFirst({
      where: {
        groupPostId: postId,
        userId: req.auth!.userId,
      },
    })

    if (existing && existing.type === input.type.toUpperCase()) {
      await prisma.groupPostReaction.delete({ where: { id: existing.id } })
    } else if (existing) {
      await prisma.groupPostReaction.update({
        where: { id: existing.id },
        data: { type: input.type === 'like' ? ReactionType.LIKE : ReactionType.DISLIKE },
      })
    } else {
      await prisma.groupPostReaction.create({
        data: {
          groupPostId: postId,
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

groupRouter.get('/groups/:slug/materials', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const group = await prisma.group.findUniqueOrThrow({ where: { slug: String(req.params.slug) } })
    await assertCanViewInternal(group.id, req.auth!.userId)
    const materials = await prisma.groupMaterial.findMany({
      where: { groupId: group.id },
      orderBy: { createdAt: 'desc' },
    })
    res.json(materials.map(mapGroupMaterial))
  } catch (error) {
    next(error)
  }
})

groupRouter.post('/groups/:slug/materials', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const group = await prisma.group.findUniqueOrThrow({ where: { slug: String(req.params.slug) } })
    const input = groupMaterialSchema.parse(req.body)
    await assertTaskManager(group.id, req.auth!.userId)

    if (!input.resourceUrl && !input.fileUrl) {
      throw new HttpError(400, 'Materi membutuhkan tautan atau file.')
    }

    const material = await prisma.groupMaterial.create({
      data: {
        groupId: group.id,
        uploaderId: req.auth!.userId,
        title: input.title,
        description: input.description,
        type: input.type,
        resourceUrl: input.resourceUrl || null,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        mimeType: input.mimeType,
      },
    })

    res.status(201).json(mapGroupMaterial(material))
  } catch (error) {
    next(error)
  }
})

groupRouter.get('/groups/:slug/tasks', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const group = await prisma.group.findUniqueOrThrow({ where: { slug: String(req.params.slug) } })
    await assertCanViewInternal(group.id, req.auth!.userId)
    const tasks = await prisma.groupTask.findMany({
      where: { groupId: group.id },
      orderBy: { createdAt: 'desc' },
    })
    res.json(
      tasks.map((task) => ({
        ...task,
        createdAt: task.createdAt.toISOString(),
        dueDate: task.dueDate.toISOString(),
      })),
    )
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
      group: {
        ...mapGroup(group),
        viewerRole: membership?.groupRole.toLowerCase() ?? null,
      },
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
