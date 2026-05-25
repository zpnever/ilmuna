import crypto from 'node:crypto'
import { Router } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

import { env } from '../config/env.js'
import {
  clearRefreshCookie,
  hashPassword,
  hashToken,
  setRefreshCookie,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from '../lib/auth.js'
import { HttpError } from '../lib/http-error.js'
import { prisma } from '../lib/prisma.js'
import { mapUser } from '../lib/serializers.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

const authRouter = Router()

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

const googleAuthSchema = z.object({
  credential: z.string().min(1),
})

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID)

async function issueTokens(userId: string, role: UserRole) {
  const accessToken = signAccessToken({
    userId,
    role,
  })
  const refreshToken = signRefreshToken({ userId })

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  })

  return {
    accessToken,
    refreshToken,
  }
}

async function verifyGoogleCredential(credential: string) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload?.sub || !payload.email) {
      throw new HttpError(401, 'Identitas Google tidak valid.')
    }
    if (!payload.email_verified) {
      throw new HttpError(401, 'Email Google belum terverifikasi.')
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name ?? '',
      picture: payload.picture ?? '',
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error
    }

    const message = error instanceof Error ? error.message : ''
    if (/Wrong recipient|Invalid token audience/i.test(message)) {
      throw new HttpError(401, 'Google Client ID tidak cocok dengan credential yang dikirim.')
    }
    if (/Token used too late|expired/i.test(message)) {
      throw new HttpError(401, 'Credential Google sudah kedaluwarsa. Silakan coba login ulang.')
    }

    throw new HttpError(
      401,
      'Login Google gagal diverifikasi. Pastikan origin frontend dan Google Client ID sudah sesuai.',
    )
  }
}

function buildUsernameFromEmail(email: string) {
  return (
    email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 20) || 'ilmuna'
  )
}

async function ensureUniqueUsername(base: string) {
  let username = base
  let suffix = 1

  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${base}-${suffix}`
    suffix += 1
  }

  return username
}

authRouter.post('/register', async (req, res, next) => {
  try {
    void req
    void res
    throw new HttpError(403, 'Registrasi akun baru sedang dinonaktifkan.')
  } catch (error) {
    next(error)
  }
})

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body)
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    })

    if (!user || user.deletedAt) {
      throw new HttpError(401, 'Email atau password salah.')
    }
    if (user.isBanned) {
      throw new HttpError(403, 'Akun dibanned.')
    }

    const valid = await verifyPassword(input.password, user.passwordHash)
    if (!valid) {
      throw new HttpError(401, 'Email atau password salah.')
    }

    const tokens = await issueTokens(user.id, user.role)
    setRefreshCookie(res, tokens.refreshToken)
    res.json({
      user: {
        ...mapUser(user),
        activeRole: user.role.toLowerCase(),
      },
      accessToken: tokens.accessToken,
    })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/google', async (req, res, next) => {
  try {
    const input = googleAuthSchema.parse(req.body)
    const googlePayload = await verifyGoogleCredential(input.credential)

    let user = await prisma.user.findUnique({
      where: { email: googlePayload.email },
    })

    if (!user) {
      const username = await ensureUniqueUsername(buildUsernameFromEmail(googlePayload.email))
      user = await prisma.user.create({
        data: {
          email: googlePayload.email,
          username,
          name: googlePayload.name || username,
          passwordHash: await hashPassword(crypto.randomUUID()),
          role: UserRole.MEMBER,
          avatarUrl: googlePayload.picture,
          bio: '',
          location: '',
          website: '',
          interests: [],
          emailVerified: true,
          isVerified: false,
          googleId: googlePayload.sub,
        },
      })
    }

    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: googlePayload.sub,
        emailVerified: true,
        avatarUrl: user.avatarUrl || googlePayload.picture || '',
        name: user.name || googlePayload.name || user.username,
      },
    })

    if (user.deletedAt) {
      throw new HttpError(403, 'Akun ini sudah tidak aktif.')
    }
    if (user.isBanned) {
      throw new HttpError(403, 'Akun dibanned.')
    }

    const tokens = await issueTokens(user.id, user.role)
    setRefreshCookie(res, tokens.refreshToken)
    res.json({
      user: {
        ...mapUser(user),
        activeRole: user.role.toLowerCase(),
      },
      accessToken: tokens.accessToken,
    })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken as string | undefined
    if (!refreshToken) {
      throw new HttpError(401, 'Refresh token tidak ditemukan.')
    }

    const payload = verifyRefreshToken(refreshToken)
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    })

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new HttpError(401, 'Refresh token tidak valid.')
    }
    if (stored.user.deletedAt || stored.user.isBanned) {
      throw new HttpError(403, 'Akun tidak dapat dipakai.')
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })

    const tokens = await issueTokens(payload.userId, stored.user.role)
    setRefreshCookie(res, tokens.refreshToken)
    res.json({
      user: {
        ...mapUser(stored.user),
        activeRole: stored.user.role.toLowerCase(),
      },
      accessToken: tokens.accessToken,
    })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken as string | undefined
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: {
          tokenHash: hashToken(refreshToken),
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      })
    }
    clearRefreshCookie(res)
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.auth!.userId },
    })

    res.json({
      user: {
        ...mapUser(user),
        activeRole: user.role.toLowerCase(),
      },
    })
  } catch (error) {
    next(error)
  }
})

export { authRouter }
