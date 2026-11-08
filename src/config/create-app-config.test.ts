import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { call } from '../application/routes/test-app.mock.js'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { UserModel } from '../infra/schemas/users-schema.js'
import { hashPassword } from '../infra/adapters/hash-password-adapter.js'
import { createApp, createUsecases } from './create-app-config.js'
import { connectDatabase } from './create-database-config.js'
import type { EnvConfig } from './load-env-config.js'

const config: EnvConfig = {
  port: 0,
  adminAppUrl: 'http://app.test',
  clientAppUrl: 'http://client.test',
  databaseUrl: '',
  databaseName: 'test',
  jwtSecret: 'a-secret-long-enough-for-the-integration-test',
  // Nothing listens here, so emails fail in the background, as they would in an outage.
  smtp: { host: '127.0.0.1', port: 1, requireTls: false, from: 'f@e.com' },
  tls: { ca: '', cert: '', key: '' },
  google: null,
  facebook: null,
}

describe('the assembled application', () => {
  let server: MongoMemoryServer
  let app: ReturnType<typeof createApp>

  beforeAll(async () => {
    server = await MongoMemoryServer.create()
    await connectDatabase(server.getUri(), 'test')
    app = createApp(await createUsecases(config))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  beforeEach(async () => {
    await UserModel.deleteMany({})
    await UserModel.create({
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: await hashPassword('right-password'),
      type: 'ADMIN',
    })
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await server.stop()
    vi.restoreAllMocks()
  })

  const login = (password = 'right-password') =>
    call(app).post('/auth/login').send({ email: 'ana@example.com', password, userType: 'ADMIN', ip: '10.0.0.1' })

  it('logs in, reads the user, saves preferences and renews', async () => {
    const first = await login()
    expect(first.status).toBe(200)
    const auth = { authorization: `Bearer ${first.body.token}` }

    const me = await call(app).get('/users/me').set(auth)
    expect(me.body).toMatchObject({ email: 'ana@example.com', preferences: { theme: null } })
    expect(JSON.stringify(me.body)).not.toContain('passwordHash')

    const saved = await call(app).patch('/users/me/preferences').set(auth).send({ language: 'en' })
    expect(saved.body.preferences.language).toBe('en')

    const renewed = await call(app).post('/auth/refresh').set(auth)
    expect(renewed.status).toBe(200)
    expect(renewed.body.token).not.toBe(first.body.token)
  })

  it('gives each login its own working token', async () => {
    const [first, second] = [await login(), await login()]
    expect(first.body.token).not.toBe(second.body.token)
    for (const response of [first, second]) {
      const me = await call(app).get('/users/me').set('authorization', `Bearer ${response.body.token}`)
      expect(me.status).toBe(200)
    }
  })

  it('locks on the third wrong password, even for the right one', async () => {
    for (let i = 0; i < 3; i += 1) expect((await login('wrong')).status).toBe(401)
    expect((await login()).status).toBe(401)
  })

  it('answers password reset requests the same way, even with email down', async () => {
    const known = await call(app).post('/auth/forgot-password').send({ email: 'ana@example.com' })
    const missing = await call(app).post('/auth/forgot-password').send({ email: 'nobody@example.com' })
    expect([known.status, missing.status]).toEqual([202, 202])
    expect(known.text).toBe(missing.text)
  })
})
