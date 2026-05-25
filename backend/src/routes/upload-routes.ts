import multer from 'multer'
import { Router } from 'express'

import { saveBufferToStorage } from '../lib/storage.js'
import { HttpError } from '../lib/http-error.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

const uploadRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 6,
  },
})

function requireSingleFile(
  file: Express.Multer.File | undefined,
  message = 'File wajib diunggah.',
) {
  if (!file) {
    throw new HttpError(400, message)
  }

  return file
}

uploadRouter.post(
  '/uploads/avatar',
  requireAuth,
  upload.single('file'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      void req.auth
      const saved = await saveBufferToStorage('avatars', requireSingleFile(req.file))
      res.status(201).json(saved)
    } catch (error) {
      next(error)
    }
  },
)

uploadRouter.post(
  '/uploads/cover',
  requireAuth,
  upload.single('file'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      void req.auth
      const saved = await saveBufferToStorage('covers', requireSingleFile(req.file))
      res.status(201).json(saved)
    } catch (error) {
      next(error)
    }
  },
)

uploadRouter.post(
  '/uploads/post-images',
  requireAuth,
  upload.array('files', 4),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      void req.auth
      const files = req.files as Express.Multer.File[] | undefined
      if (!files?.length) {
        throw new HttpError(400, 'Minimal satu gambar wajib diunggah.')
      }

      const saved = await Promise.all(files.map((file) => saveBufferToStorage('posts', file)))
      res.status(201).json({
        files: saved,
      })
    } catch (error) {
      next(error)
    }
  },
)

uploadRouter.post(
  '/uploads/group-cover',
  requireAuth,
  upload.single('file'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      void req.auth
      const saved = await saveBufferToStorage('groups', requireSingleFile(req.file))
      res.status(201).json(saved)
    } catch (error) {
      next(error)
    }
  },
)

uploadRouter.post(
  '/uploads/material',
  requireAuth,
  upload.single('file'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      void req.auth
      const saved = await saveBufferToStorage('materials', requireSingleFile(req.file))
      res.status(201).json(saved)
    } catch (error) {
      next(error)
    }
  },
)

export { uploadRouter }
