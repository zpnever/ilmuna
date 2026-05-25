import { Router } from 'express'
import { z } from 'zod'

import {
  getHadithBooks,
  getHadithPage,
  getQuranAyah,
  getQuranSurahDetail,
  getQuranSurahList,
  searchQuran,
} from '../lib/reference-store.js'
import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

const referenceRouter = Router()

referenceRouter.get('/quran/surahs', async (_req, res, next) => {
  try {
    res.json(await getQuranSurahList())
  } catch (error) {
    next(error)
  }
})

referenceRouter.get('/quran/surahs/:surahNumber', async (req, res, next) => {
  try {
    res.json(await getQuranSurahDetail(Number(req.params.surahNumber)))
  } catch (error) {
    next(error)
  }
})

referenceRouter.get('/quran/ayah/:surahNumber/:ayahNumber', async (req, res, next) => {
  try {
    const ayah = await getQuranAyah(Number(req.params.surahNumber), Number(req.params.ayahNumber))
    res.json(ayah)
  } catch (error) {
    next(error)
  }
})

referenceRouter.get('/quran/search', async (req, res, next) => {
  try {
    const query = z.object({
      q: z.string().default(''),
      surahNumber: z.coerce.number().optional(),
    }).parse(req.query)
    res.json(await searchQuran(query.q, query.surahNumber))
  } catch (error) {
    next(error)
  }
})

referenceRouter.get('/hadith/books', async (_req, res, next) => {
  try {
    res.json(await getHadithBooks())
  } catch (error) {
    next(error)
  }
})

referenceRouter.get('/hadith/books/:bookSlug', async (req, res, next) => {
  try {
    const query = z.object({
      limit: z.coerce.number().min(1).max(100).default(40),
      offset: z.coerce.number().min(0).default(0),
      q: z.string().default(''),
    }).parse(req.query)
    const result = await getHadithPage(req.params.bookSlug, query.limit, query.offset, query.q)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

referenceRouter.get('/bookmarks', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const [quran, hadith] = await Promise.all([
      prisma.quranBookmark.findMany({
        where: { userId: req.auth!.userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.hadithBookmark.findMany({
        where: { userId: req.auth!.userId },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    res.json({
      quran: quran.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })),
      hadith: hadith.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })),
    })
  } catch (error) {
    next(error)
  }
})

export { referenceRouter }
