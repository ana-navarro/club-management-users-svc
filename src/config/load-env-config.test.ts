import { expect, it } from 'vitest'
import { loadEnvConfig } from './load-env-config.js'

const env = {
  ADMIN_APP_URL: 'http://admin.test',
  CLIENT_APP_URL: 'http://client.test',
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

it('reads the app URL of each system', () => {
  expect(loadEnvConfig(env)).toMatchObject({ adminAppUrl: 'http://admin.test', clientAppUrl: 'http://client.test' })
})

it('requires both app URLs', () => {
  expect(() => loadEnvConfig({ ...env, ADMIN_APP_URL: '', CLIENT_APP_URL: undefined })).toThrow(
    'Missing environment variables: ADMIN_APP_URL, CLIENT_APP_URL',
  )
})

it('names every missing variable, without any value', () => {
  expect(() => loadEnvConfig({ ...env, JWT_SECRET: '', TLS_KEY: undefined })).toThrow(
    'Missing environment variables: JWT_SECRET, TLS_KEY',
  )
})

it('leaves a provider without credentials unconfigured', () => {
  expect(loadEnvConfig(env)).toMatchObject({ google: null, facebook: null })
  expect(loadEnvConfig({ ...env, GOOGLE_CLIENT_ID: 'id' }).google).toBeNull()
})

it('uses the real Google URLs by default', () => {
  expect(loadEnvConfig({ ...env, GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret' }).google).toEqual({
    clientId: 'id',
    clientSecret: 'secret',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
    issuers: ['https://accounts.google.com', 'accounts.google.com'],
  })
})

it('reads the Google URLs and a list of issuers', () => {
  const google = loadEnvConfig({
    ...env,
    GOOGLE_CLIENT_ID: 'id',
    GOOGLE_CLIENT_SECRET: 'secret',
    GOOGLE_AUTHORIZE_URL: 'http://localhost:8090/google/authorize',
    GOOGLE_TOKEN_URL: 'http://mock/token',
    GOOGLE_JWKS_URL: 'http://mock/jwks',
    GOOGLE_ISSUERS: ' http://mock/google , other ,',
  }).google
  expect(google).toMatchObject({ authorizeUrl: 'http://localhost:8090/google/authorize', issuers: ['http://mock/google', 'other'] })
})

it('uses the real Facebook URLs and the chosen version by default', () => {
  expect(loadEnvConfig({ ...env, FACEBOOK_APP_ID: 'app', FACEBOOK_APP_SECRET: 'secret' }).facebook).toEqual({
    appId: 'app',
    appSecret: 'secret',
    authorizeUrl: 'https://www.facebook.com/v23.0/dialog/oauth',
    graphUrl: 'https://graph.facebook.com',
    graphVersion: 'v23.0',
    scope: 'email,public_profile',
  })
})

it('reads the Facebook URLs, version and scope', () => {
  const facebook = loadEnvConfig({
    ...env,
    FACEBOOK_APP_ID: 'app',
    FACEBOOK_APP_SECRET: 'secret',
    FACEBOOK_AUTHORIZE_URL: 'http://localhost:8090/facebook/dialog/oauth',
    FACEBOOK_GRAPH_URL: 'http://mock/facebook',
    FACEBOOK_GRAPH_VERSION: 'v24.0',
    FACEBOOK_SCOPE: 'email',
  }).facebook
  expect(facebook).toEqual({
    appId: 'app',
    appSecret: 'secret',
    authorizeUrl: 'http://localhost:8090/facebook/dialog/oauth',
    graphUrl: 'http://mock/facebook',
    graphVersion: 'v24.0',
    scope: 'email',
  })
})
