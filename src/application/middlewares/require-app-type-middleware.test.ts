import express from 'express'
import request from 'supertest'
import { expect, it } from 'vitest'
import { requireAppType, type AppTypeLocals } from './require-app-type-middleware.js'

const makeApp = () => {
  const app = express()
  app.use(requireAppType)
  app.get('/', (_request, response: express.Response<object, AppTypeLocals>) => {
    response.json({ appType: response.locals.appType })
  })
  return app
}

it.each([['ADMIN'], ['CLIENT']])('saves %s and continues', async (appType) => {
  const response = await request(makeApp()).get('/').set('x-app-type', appType)
  expect(response.body).toEqual({ appType })
})

it.each([['client'], ['ROOT'], ['']])('answers 400 for "%s"', async (appType) => {
  const response = await request(makeApp()).get('/').set('x-app-type', appType)
  expect(response.status).toBe(400)
  expect(response.body).toEqual({ error: 'invalid_request' })
})

it('answers 400 without the header', async () => {
  expect((await request(makeApp()).get('/')).status).toBe(400)
})
