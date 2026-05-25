import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

import { HttpError } from '../lib/http-error.js'

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    message: 'Route tidak ditemukan.',
  })
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: 'Validasi gagal.',
      issues: error.issues,
    })
    return
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      message: error.message,
    })
    return
  }

  console.error(error)
  res.status(500).json({
    message: 'Terjadi kesalahan server.',
  })
}
