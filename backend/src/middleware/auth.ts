import type { NextFunction, Request, Response } from 'express'
import { UserRole } from '@prisma/client'

import { verifyAccessToken } from '../lib/auth.js'
import { HttpError } from '../lib/http-error.js'
import { prisma } from '../lib/prisma.js'

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string
    role: UserRole
  }
}

export async function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) {
      throw new HttpError(401, 'Autentikasi diperlukan.')
    }

    const payload = verifyAccessToken(token)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, isBanned: true, deletedAt: true },
    })

    if (!user || user.deletedAt) {
      throw new HttpError(401, 'Sesi tidak valid.')
    }
    if (user.isBanned) {
      throw new HttpError(403, 'Akun dibanned.')
    }

    req.auth = {
      userId: user.id,
      role: user.role,
    }
    next()
  } catch (error) {
    next(error)
  }
}

export function requireAdmin(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  if (!req.auth || req.auth.role !== UserRole.ADMIN) {
    next(new HttpError(403, 'Akses admin diperlukan.'))
    return
  }
  next()
}
