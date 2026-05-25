import { Router } from 'express'
import { z } from 'zod'

import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

const bookmarkRouter = Router()

bookmarkRouter.get('/bookmarks/quran', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const bookmarks = await prisma.quranBookmark.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: 'desc' },
    })
    res.json(bookmarks.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })))
  } catch (error) {
    next(error)
  }
})

bookmarkRouter.post('/bookmarks/quran/toggle', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = z.object({
      surahNumber: z.number(),
      ayahNumber: z.number(),
      surahName: z.string(),
      arabicText: z.string(),
      translation: z.string(),
      note: z.string().default(''),
    }).parse(req.body)

    const existing = await prisma.quranBookmark.findUnique({
      where: {
        userId_surahNumber_ayahNumber: {
          userId: req.auth!.userId,
          surahNumber: input.surahNumber,
          ayahNumber: input.ayahNumber,
        },
      },
    })
    if (existing) {
      await prisma.quranBookmark.delete({ where: { id: existing.id } })
      res.json(null)
      return
    }

    const bookmark = await prisma.quranBookmark.create({
      data: {
        userId: req.auth!.userId,
        ...input,
      },
    })
    res.status(201).json({ ...bookmark, createdAt: bookmark.createdAt.toISOString() })
  } catch (error) {
    next(error)
  }
})

bookmarkRouter.patch('/bookmarks/quran/:bookmarkId', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const bookmarkId = String(req.params.bookmarkId)
    const input = z.object({ note: z.string() }).parse(req.body)
    const bookmark = await prisma.quranBookmark.update({
      where: { id: bookmarkId },
      data: { note: input.note },
    })
    res.json({ ...bookmark, createdAt: bookmark.createdAt.toISOString() })
  } catch (error) {
    next(error)
  }
})

bookmarkRouter.get('/bookmarks/hadith', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const bookmarks = await prisma.hadithBookmark.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: 'desc' },
    })
    res.json(bookmarks.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })))
  } catch (error) {
    next(error)
  }
})

bookmarkRouter.post('/bookmarks/hadith/toggle', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = z.object({
      bookSlug: z.string(),
      bookName: z.string(),
      hadithNumber: z.number(),
      arabicText: z.string(),
      translation: z.string(),
      note: z.string().default(''),
    }).parse(req.body)

    const existing = await prisma.hadithBookmark.findUnique({
      where: {
        userId_bookSlug_hadithNumber: {
          userId: req.auth!.userId,
          bookSlug: input.bookSlug,
          hadithNumber: input.hadithNumber,
        },
      },
    })
    if (existing) {
      await prisma.hadithBookmark.delete({ where: { id: existing.id } })
      res.json(null)
      return
    }
    const bookmark = await prisma.hadithBookmark.create({
      data: {
        userId: req.auth!.userId,
        ...input,
      },
    })
    res.status(201).json({ ...bookmark, createdAt: bookmark.createdAt.toISOString() })
  } catch (error) {
    next(error)
  }
})

bookmarkRouter.patch('/bookmarks/hadith/:bookmarkId', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const bookmarkId = String(req.params.bookmarkId)
    const input = z.object({ note: z.string() }).parse(req.body)
    const bookmark = await prisma.hadithBookmark.update({
      where: { id: bookmarkId },
      data: { note: input.note },
    })
    res.json({ ...bookmark, createdAt: bookmark.createdAt.toISOString() })
  } catch (error) {
    next(error)
  }
})

export { bookmarkRouter }
