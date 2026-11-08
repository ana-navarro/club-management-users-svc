import { describe, expect, it } from 'vitest'
import {
  InvalidSocialCodeError,
  InvalidSocialLinkError,
  InvalidStateError,
  ProviderUnavailableError,
} from '../../domain/models/auth-errors-model.js'
import { call, clientUser, makeApp, makeUsecases } from './test-app.mock.js'

const callback = { binding: 'b', state: 's', code: 'c', ip: '1.2.3.4', userAgent: 'Firefox' }

describe('POST /auth/social/:provider/authorization', () => {
  it('returns the provider URL', async () => {
    const usecases = makeUsecases()
    const response = await call(makeApp(usecases), 'CLIENT')
      .post('/auth/social/google/authorization')
      .send({ binding: 'b', language: 'en' })
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ url: 'https://provider.test/authorize' })
    expect(usecases.startSocialLogin.execute).toHaveBeenCalledWith({ provider: 'google', binding: 'b', language: 'en' })
  })

  it('answers 404 for an unknown provider and for the admin system', async () => {
    const usecases = makeUsecases()
    const app = makeApp(usecases)
    expect((await call(app, 'CLIENT').post('/auth/social/instagram/authorization').send({ binding: 'b' })).status).toBe(404)
    expect((await call(app, 'ADMIN').post('/auth/social/google/authorization').send({ binding: 'b' })).status).toBe(404)
    expect(usecases.startSocialLogin.execute).not.toHaveBeenCalled()
  })

  it('answers 503 when the provider is not configured', async () => {
    const usecases = makeUsecases()
    usecases.startSocialLogin.execute.mockRejectedValue(new ProviderUnavailableError(false))
    const response = await call(makeApp(usecases), 'CLIENT').post('/auth/social/facebook/authorization').send({ binding: 'b' })
    expect(response.status).toBe(503)
    expect(response.body).toEqual({ error: 'provider_unavailable' })
  })

  it('refuses a body without binding', async () => {
    const response = await call(makeApp(), 'CLIENT').post('/auth/social/google/authorization').send({})
    expect(response.status).toBe(400)
  })
})

describe('POST /auth/social/:provider/callback', () => {
  it('returns the exchange code', async () => {
    const usecases = makeUsecases()
    const response = await call(makeApp(usecases), 'CLIENT').post('/auth/social/google/callback').send(callback)
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ code: 'exchange-code' })
    expect(usecases.completeSocialLogin.execute).toHaveBeenCalledWith({ provider: 'google', ...callback })
  })

  it('answers 202 while a first Facebook entry waits for the email confirmation', async () => {
    const usecases = makeUsecases()
    usecases.completeSocialLogin.execute.mockResolvedValue({ status: 'pending' })
    const response = await call(makeApp(usecases), 'CLIENT').post('/auth/social/facebook/callback').send(callback)
    expect(response.status).toBe(202)
    expect(response.body).toEqual({ pending: 'email_confirmation' })
  })

  it('accepts a provider error without a code', async () => {
    const usecases = makeUsecases()
    const body = { binding: 'b', state: 's', error: 'access_denied' }
    await call(makeApp(usecases), 'CLIENT').post('/auth/social/google/callback').send(body)
    expect(usecases.completeSocialLogin.execute).toHaveBeenCalledWith({ provider: 'google', ...body })
  })

  it('maps an invalid state', async () => {
    const usecases = makeUsecases()
    usecases.completeSocialLogin.execute.mockRejectedValue(new InvalidStateError())
    const response = await call(makeApp(usecases), 'CLIENT').post('/auth/social/google/callback').send(callback)
    expect(response.body).toEqual({ error: 'invalid_state' })
  })
})

describe('POST /auth/social/session', () => {
  it('returns the session like the password login', async () => {
    const response = await call(makeApp(), 'CLIENT').post('/auth/social/session').send({ code: 'c' })
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      token: 'jwt',
      expiresAt: '2026-01-01T12:00:00.000Z',
      renewAt: '2026-01-01T11:30:00.000Z',
      user: clientUser,
    })
  })

  it('answers 401 for an invalid code', async () => {
    const usecases = makeUsecases()
    usecases.exchangeSocialCode.execute.mockRejectedValue(new InvalidSocialCodeError())
    const response = await call(makeApp(usecases), 'CLIENT').post('/auth/social/session').send({ code: 'c' })
    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'invalid_social_code' })
  })
})

describe('/auth/social/link', () => {
  it('previews the request', async () => {
    const response = await call(makeApp(), 'CLIENT').post('/auth/social/link/preview').send({ token: 't' })
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ provider: 'facebook', profileName: 'Ana FB', email: 'ana@example.com' })
  })

  it('confirms and declines with 204', async () => {
    const usecases = makeUsecases()
    const app = makeApp(usecases)
    expect((await call(app, 'CLIENT').post('/auth/social/link/confirm').send({ token: 't' })).status).toBe(204)
    expect((await call(app, 'CLIENT').post('/auth/social/link/decline').send({ token: 't' })).status).toBe(204)
    expect(usecases.confirmSocialLink.execute).toHaveBeenCalledWith({ token: 't' })
    expect(usecases.declineSocialLink.execute).toHaveBeenCalledWith({ token: 't' })
  })

  it('maps an invalid link', async () => {
    const usecases = makeUsecases()
    usecases.confirmSocialLink.execute.mockRejectedValue(new InvalidSocialLinkError())
    const response = await call(makeApp(usecases), 'CLIENT').post('/auth/social/link/confirm').send({ token: 't' })
    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'invalid_social_link' })
  })

  it('does not exist for the admin system', async () => {
    const response = await call(makeApp(), 'ADMIN').post('/auth/social/link/preview').send({ token: 't' })
    expect(response.status).toBe(404)
  })
})
