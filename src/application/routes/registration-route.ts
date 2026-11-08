import { Router } from 'express'
import type { RegistrationController } from '../controllers/registration-controller.js'

export function createRegistrationRoute(controller: RegistrationController): Router {
  const router = Router()
  router.post('/auth/register', controller.register)
  router.post('/auth/verify-email', controller.verifyEmail)
  router.post('/auth/resend-verification', controller.resendVerification)
  return router
}
