import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import type { Response } from 'express'
import type { CookieOptions } from 'express'

import { env } from '../config/env.js'

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function signAccessToken(payload: { userId: string; role: string }) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
  })
}

export function signRefreshToken(payload: { userId: string }) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` as jwt.SignOptions['expiresIn'],
  })
}

function getRefreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: env.IS_PRODUCTION ? 'none' : 'lax',
    secure: env.IS_PRODUCTION,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
    domain: env.IS_PRODUCTION ? env.COOKIE_DOMAIN : undefined,
  }
}

export function setRefreshCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, getRefreshCookieOptions())
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie('refreshToken', getRefreshCookieOptions())
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string; role: string }
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string }
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}
