import { Router } from 'express'

import { prisma } from '../lib/prisma.js'
import { mapNotification } from '../lib/serializers.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

const notificationRouter = Router()

notificationRouter.get('/notifications', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.auth!.userId },
      include: { actor: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(notifications.map(mapNotification))
  } catch (error) {
    next(error)
  }
})

notificationRouter.post('/notifications/:notificationId/read', requireAuth, async (req, res, next) => {
  try {
    const notificationId = String(req.params.notificationId)
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    })
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

export { notificationRouter }
