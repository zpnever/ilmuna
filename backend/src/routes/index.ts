import type { Express } from 'express'
import { Router } from 'express'

import { adminRouter } from './admin-routes.js'
import { authRouter } from './auth-routes.js'
import { bookmarkRouter } from './bookmark-routes.js'
import { groupRouter } from './group-routes.js'
import { notificationRouter } from './notification-routes.js'
import { postRouter } from './post-routes.js'
import { profileRouter } from './profile-routes.js'
import { referenceRouter } from './reference-routes.js'

export function registerRoutes(app: Express) {
  const router = Router()

  router.use('/api/v1/auth', authRouter)
  router.use('/api/v1/references', referenceRouter)
  router.use('/api/v1', profileRouter)
  router.use('/api/v1', postRouter)
  router.use('/api/v1', groupRouter)
  router.use('/api/v1', bookmarkRouter)
  router.use('/api/v1', notificationRouter)
  router.use('/api/v1', adminRouter)

  app.use(router)
}
