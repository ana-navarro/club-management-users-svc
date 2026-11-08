import { describe, expect, it } from 'vitest'
import {
  InvalidVerificationLinkError,
  TooManyRequestsError,
  WeakPasswordError,
} from '../../domain/models/auth-errors-model.js'
import { call, makeApp, makeUsecases } from './test-app.mock.js'

const body = { name: 'Ana', email: 'ana@example.com', password: 'long-enough', language: 'pt-BR', ip: '1.2.3.4' }

describe('POST /auth/register', () => {
  it('answers 202 without a body for the client system', async () => {
    const usecases = makeUsecases()
    const response = await call(makeApp(usecases), 'CLIENT').post('/auth/register').send(body)
    expect(response.status).toBe(202)
    expect(response.text).toBe('')
    expect(usecases.registerClient.execute).toHaveBeenCalledWith(body)
  })

  it('does not exist for the admin system', async () => {
    const usecases = makeUsecases()
    const response = await call(makeApp(usecases), 'ADMIN').post('/auth/register').send(body)
    expect(response.status).toBe(404)
    expect(usecases.registerClient.execute).not.toHaveBeenCalled()
  })

  it.each([
    [{ ...body, type: 'ADMIN' }],
    [{ ...body, userType: 'ADMIN' }],
    [{ ...body, name: '   ' }],
    [{ ...body, name: 'a'.repeat(101) }],
    [{ ...body, email: 'nope' }],
    [{ ...body, password: '' }],
    [{ name: 'Ana', email: 'ana@example.com' }],
  ])('answers 400 for %j', async (invalid) => {
    const response = await call(makeApp(), 'CLIENT').post('/auth/register').send(invalid)
    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'invalid_request' })
  })

  it.each([
    [new WeakPasswordError(), 400, 'weak_password'],
    [new TooManyRequestsError(), 429, 'too_many_requests'],
  ])('maps %s', async (error, status, code) => {
    const usecases = makeUsecases()
    usecases.registerClient.execute.mockRejectedValue(error)
    const response = await call(makeApp(usecases), 'CLIENT').post('/auth/register').send(body)
    expect(response.status).toBe(status)
    expect(response.body).toEqual({ error: code })
  })
})

describe('POST /auth/verify-email', () => {
  it('answers 204 when it confirms', async () => {
    const usecases = makeUsecases()
    const response = await call(makeApp(usecases), 'CLIENT').post('/auth/verify-email').send({ token: 't' })
    expect(response.status).toBe(204)
    expect(usecases.verifyEmail.execute).toHaveBeenCalledWith({ token: 't' })
  })

  it('answers 400 for an invalid link', async () => {
    const usecases = makeUsecases()
    usecases.verifyEmail.execute.mockRejectedValue(new InvalidVerificationLinkError())
    const response = await call(makeApp(usecases), 'CLIENT').post('/auth/verify-email').send({ token: 't' })
    expect(response.body).toEqual({ error: 'invalid_verification_link' })
  })

  it('answers 400 without a token', async () => {
    const response = await call(makeApp(), 'CLIENT').post('/auth/verify-email').send({})
    expect(response.status).toBe(400)
  })
})

describe('POST /auth/resend-verification', () => {
  it('always answers 202', async () => {
    const usecases = makeUsecases()
    const response = await call(makeApp(usecases), 'CLIENT')
      .post('/auth/resend-verification')
      .send({ email: 'ana@example.com', language: 'en' })
    expect(response.status).toBe(202)
    expect(usecases.resendVerification.execute).toHaveBeenCalledWith({ email: 'ana@example.com', language: 'en' })
  })
})
