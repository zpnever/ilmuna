import path from 'node:path'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import morgan from 'morgan'

import { env } from './config/env.js'
import { ensureStorageDirectories } from './lib/storage.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { registerRoutes } from './routes/index.js'

export function createApp() {
  const app = express()
  void ensureStorageDirectories()

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '2mb' }))
  app.use(cookieParser())
  app.use(morgan('dev'))
  app.use('/storage', express.static(path.resolve(process.cwd(), 'storage')))

  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  registerRoutes(app)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
