import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import morgan from 'morgan'

import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { registerRoutes } from './routes/index.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '2mb' }))
  app.use(cookieParser())
  app.use(morgan('dev'))

  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  registerRoutes(app)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
