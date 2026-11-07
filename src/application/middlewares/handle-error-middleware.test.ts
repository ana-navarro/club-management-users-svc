import express from 'express'
import request from 'supertest'
import { afterEach, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
  InvalidCredentialsError,
  InvalidResetLinkError,
  InvalidTokenError,
  WeakPasswordError,
} from '../../domain/models/auth-errors-model.js'
import { handleError } from './handle-error-middleware.js'

const appFailingWith = (error: Error | string) => {
  const app = express()
  app.get('/', (_request, _response, next) => next(error))
  app.use(handleError)
  return app
}

afterEach(() => {
  vi.restoreAllMocks()
})

it.each([
  [new InvalidCredentialsError(), 401, 'invalid_credentials'],
  [new InvalidTokenError(), 401, 'invalid_token'],
  [new InvalidResetLinkError(), 400, 'invalid_reset_link'],
  [new WeakPasswordError(), 400, 'weak_password'],
  [new z.ZodError([]), 400, 'invalid_request'],
  [new SyntaxError('bad json'), 400, 'invalid_request'],
])('maps %s', async (error, status, code) => {
  const response = await request(appFailingWith(error)).get('/')
  expect(response.status).toBe(status)
  expect(response.body).toEqual({ error: code })
})

it.each([[new Error('password=secret')], ['password=secret']])('hides the details of unexpected errors', async (error) => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const response = await request(appFailingWith(error)).get('/')
  expect(response.status).toBe(500)
  expect(response.body).toEqual({ error: 'internal_error' })
  expect(JSON.stringify(log.mock.calls)).not.toContain('secret')
})
