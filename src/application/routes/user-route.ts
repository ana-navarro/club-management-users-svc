import { Router } from 'express'
import type { UserController } from '../controllers/user-controller.js'
import type { RequireAuth } from '../middlewares/require-auth-middleware.js'

export function createUserRoute(controller: UserController, requireAuth: RequireAuth): Router {
  const router = Router()
  router.get('/users/me', requireAuth, controller.getMe)
  router.patch('/users/me/preferences', requireAuth, controller.updatePreferences)
  return router
}
