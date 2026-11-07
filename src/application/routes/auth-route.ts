import { Router } from 'express'
import type { AuthController } from '../controllers/auth-controller.js'
import type { RequireAuth } from '../middlewares/require-auth-middleware.js'

export function createAuthRoute(controller: AuthController, requireAuth: RequireAuth): Router {
  const router = Router()
  router.post('/auth/login', controller.login)
  router.post('/auth/refresh', requireAuth, controller.refresh)
  router.post('/auth/forgot-password', controller.forgotPassword)
  router.post('/auth/reset-password', controller.resetPassword)
  return router
}
