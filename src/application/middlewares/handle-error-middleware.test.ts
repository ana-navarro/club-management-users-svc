import express from 'express'
import request from 'supertest'
import { afterEach, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
  EmailNotVerifiedError,
  EmailRequiredError,
  InvalidCredentialsError,
  InvalidResetLinkError,
  InvalidSocialCodeError,
  InvalidSocialLinkError,
  InvalidStateError,
  InvalidTokenError,
  InvalidVerificationLinkError,
  NotFoundError,
  ProviderUnavailableError,
  SocialLoginCancelledError,
  TooManyRequestsError,
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
  [new NotFoundError(), 404, 'not_found'],
  [new EmailNotVerifiedError(), 403, 'email_not_verified'],
  [new InvalidVerificationLinkError(), 400, 'invalid_verification_link'],
  [new TooManyRequestsError(), 429, 'too_many_requests'],
  [new InvalidStateError(), 400, 'invalid_state'],
  [new SocialLoginCancelledError(), 400, 'cancelled'],
  [new EmailRequiredError(), 400, 'email_required'],
  [new ProviderUnavailableError(), 502, 'provider_unavailable'],
  [new ProviderUnavailableError(false), 503, 'provider_unavailable'],
  [new InvalidSocialCodeError(), 401, 'invalid_social_code'],
  [new InvalidSocialLinkError(), 400, 'invalid_social_link'],
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
