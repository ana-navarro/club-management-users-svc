import express, { type Express } from 'express'
import { GetHealthController } from '../application/controllers/get-health-controller.js'
import { createGetHealthRoute } from '../application/routes/get-health-route.js'
import { GetHealthUsecase } from '../domain/usecases/get-health-usecase.js'

export function createApp(): Express {
  const app = express()
  app.use(express.json())
  app.use(createGetHealthRoute(new GetHealthController(new GetHealthUsecase())))
  return app
}
