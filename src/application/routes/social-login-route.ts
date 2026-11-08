import { Router } from 'express'
import type { SocialLoginController } from '../controllers/social-login-controller.js'

export function createSocialLoginRoute(controller: SocialLoginController): Router {
  const router = Router()
  // The fixed paths come first, so "session" and "link" are never read as a provider.
  router.post('/auth/social/session', controller.session)
  router.post('/auth/social/link/preview', controller.previewLink)
  router.post('/auth/social/link/confirm', controller.confirmLink)
  router.post('/auth/social/link/decline', controller.declineLink)
  router.post('/auth/social/:provider/authorization', controller.authorization)
  router.post('/auth/social/:provider/callback', controller.callback)
  return router
}
