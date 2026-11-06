import { expect, it } from 'vitest'
import { loadEnvConfig } from './load-env-config.js'

const env = {
  APP_URL: 'http://localhost',
  DATABASE_URL: 'mongodb://mongo',
  DATABASE_NAME: 'db',
  JWT_SECRET: 's',
  SMTP_HOST: 'h',
  SMTP_PORT: '587',
  SMTP_FROM: 'f@e.com',
  TLS_CA: 'c',
  TLS_CERT: 'r',
  TLS_KEY: 'k',
}

it('uses the default port when PORT is not set', () => {
  expect(loadEnvConfig(env).port).toBe(3001)
})

it('reads the port from PORT', () => {
  expect(loadEnvConfig({ ...env, PORT: '9000' }).port).toBe(9000)
})

it('reads SMTP options', () => {
  expect(loadEnvConfig({ ...env, SMTP_REQUIRE_TLS: 'true', SMTP_USER: 'u', SMTP_PASSWORD: 'p' }).smtp).toEqual({
    host: 'h',
    port: 587,
    requireTls: true,
    user: 'u',
    password: 'p',
    from: 'f@e.com',
  })
  expect(loadEnvConfig({ ...env, SMTP_USER: '' }).smtp).toMatchObject({ requireTls: false, user: undefined })
})

it('names every missing variable, without any value', () => {
  expect(() => loadEnvConfig({ ...env, JWT_SECRET: '', TLS_KEY: undefined })).toThrow(
    'Missing environment variables: JWT_SECRET, TLS_KEY',
  )
})
