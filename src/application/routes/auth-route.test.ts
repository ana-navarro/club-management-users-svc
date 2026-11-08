import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { InvalidCredentialsError, InvalidResetLinkError, WeakPasswordError } from '../../domain/models/auth-errors-model.js'
import { call, claims, makeApp, makeUsecases, publicUser } from './test-app.mock.js'

const loginBody = { email: 'ana@example.com', password: 'secret', userType: 'ADMIN' }

describe('/auth', () => {
  it('logs in', async () => {
    const usecases = makeUsecases()
    const response = await call(makeApp(usecases)).post('/auth/login').send({ ...loginBody, ip: '1.2.3.4', userAgent: 'x' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      token: 'jwt',
      expiresAt: '2026-01-01T12:00:00.000Z',
      renewAt: '2026-01-01T11:30:00.000Z',
      user: publicUser,
    })
    expect(usecases.loginUser.execute).toHaveBeenCalledWith({ ...loginBody, ip: '1.2.3.4', userAgent: 'x' })
  })

  it('answers 401 for wrong credentials', async () => {
    const usecases = makeUsecases()
    usecases.loginUser.execute.mockRejectedValue(new InvalidCredentialsError())
    const response = await call(makeApp(usecases)).post('/auth/login').send(loginBody)
    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'invalid_credentials' })
  })

  it.each([
    [{ ...loginBody, email: 'nope' }],
    [{ ...loginBody, password: '' }],
    [{ ...loginBody, userType: 'ROOT' }],
    [{ ...loginBody, extra: true }],
    [{ ...loginBody, email: { $ne: null } }],
  ])('answers 400 for %j', async (body) => {
    const response = await call(makeApp()).post('/auth/login').send(body)
    expect(response.status).toBe(400)
  })

  it('answers 400 for invalid JSON', async () => {
    const response = await call(makeApp()).post('/auth/login').set('content-type', 'application/json').send('{')
    expect(response.status).toBe(400)
  })

  it('renews with a valid token', async () => {
    const usecases = makeUsecases()
    const response = await call(makeApp(usecases)).post('/auth/refresh').set('authorization', 'Bearer good')
    expect(response.status).toBe(200)
    expect(response.body.token).toBe('jwt')
    expect(usecases.refreshToken.execute).toHaveBeenCalledWith(claims)
  })

  it('refuses to renew without a valid token', async () => {
    const app = makeApp()
    expect((await call(app).post('/auth/refresh')).status).toBe(401)
    expect((await call(app).post('/auth/refresh').set('authorization', 'Bearer bad')).status).toBe(401)
  })

  it('accepts a password reset request', async () => {
    const usecases = makeUsecases()
    const response = await call(makeApp(usecases)).post('/auth/forgot-password').send({ email: 'x@example.com' })
    expect(response.status).toBe(202)
    expect(response.text).toBe('')
    expect(usecases.requestPasswordReset.execute).toHaveBeenCalledWith({ email: 'x@example.com' })
  })

  it('resets a password', async () => {
    const response = await call(makeApp()).post('/auth/reset-password').send({ token: 't', password: 'long-enough' })
    expect(response.status).toBe(204)
  })

  it.each([
    [new InvalidResetLinkError(), 'invalid_reset_link'],
    [new WeakPasswordError(), 'weak_password'],
  ])('answers 400 with the reason for %s', async (error, code) => {
    const usecases = makeUsecases()
    usecases.resetPassword.execute.mockRejectedValue(error)
    const response = await call(makeApp(usecases)).post('/auth/reset-password').send({ token: 't', password: 'x' })
    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: code })
  })
})

describe('X-App-Type', () => {
  it('answers 400 without the header', async () => {
    const response = await request(makeApp()).post('/auth/login').send(loginBody)
    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'invalid_request' })
  })

  it('refuses a token of the other system', async () => {
    const response = await call(makeApp(), 'CLIENT').post('/auth/refresh').set('authorization', 'Bearer good')
    expect(response.status).toBe(401)
  })
})

it('forwards a client login from the client system', async () => {
  const usecases = makeUsecases()
  const body = { ...loginBody, userType: 'CLIENT' }
  const response = await call(makeApp(usecases), 'CLIENT').post('/auth/login').send(body)
  expect(response.status).toBe(200)
  expect(usecases.loginUser.execute).toHaveBeenCalledWith(body)
})
