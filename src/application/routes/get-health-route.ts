import { Router } from 'express'
import type { GetHealthController } from '../controllers/get-health-controller.js'

export function createGetHealthRoute(controller: GetHealthController): Router {
  const router = Router()
  router.get('/health', controller.handle)
  return router
}
