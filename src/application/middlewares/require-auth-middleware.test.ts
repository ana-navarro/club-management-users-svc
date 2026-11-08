import express from 'express'
import request from 'supertest'
import { expect, it, vi } from 'vitest'
import { InvalidTokenError } from '../../domain/models/auth-errors-model.js'
import { makeClaims } from '../../domain/models/user-model.mock.js'
import { handleError } from './handle-error-middleware.js'
import { requireAppType } from './require-app-type-middleware.js'
import { createRequireAuth, type AuthenticatedResponse } from './require-auth-middleware.js'

const claims = makeClaims()

const makeApp = () => {
  const verifyToken = vi.fn((token: string) => {
    if (token !== 'good') throw new InvalidTokenError()
    return claims
  })
  const app = express()
  app.use(requireAppType)
  app.get('/', createRequireAuth(verifyToken), (_request, response: AuthenticatedResponse) => {
    response.json({ userId: response.locals.claims.userId })
  })
  app.use(handleError)
  return app
}

it('saves the claims and continues', async () => {
  const response = await request(makeApp()).get('/').set('x-app-type', 'ADMIN').set('authorization', 'Bearer good')
  expect(response.body).toEqual({ userId: 'u1' })
})

it.each([[''], ['abc'], ['Basic good'], ['Bearer '], ['Bearer bad']])('rejects "%s"', async (authorization) => {
  const response = await request(makeApp()).get('/').set('x-app-type', 'ADMIN').set('authorization', authorization)
  expect(response.status).toBe(401)
})

it('rejects a missing header', async () => {
  expect((await request(makeApp()).get('/').set('x-app-type', 'ADMIN')).status).toBe(401)
})

it('rejects a token of the other system', async () => {
  const response = await request(makeApp()).get('/').set('x-app-type', 'CLIENT').set('authorization', 'Bearer good')
  expect(response.status).toBe(401)
  expect(response.body).toEqual({ error: 'invalid_token' })
})
