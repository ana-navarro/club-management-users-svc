import { describe, expect, it } from 'vitest'
import { ProviderUnavailableError } from '../domain/models/auth-errors-model.js'
import { createSocialProviders } from './create-app-config.js'
import type { EnvConfig } from './load-env-config.js'

// Nothing listens on port 1, so every call to a provider fails like an outage.
const config: EnvConfig = {
  port: 0,
  adminAppUrl: 'http://admin.test',
  clientAppUrl: 'http://client.test',
  databaseUrl: '',
  databaseName: 'test',
  jwtSecret: 'secret',
  smtp: { host: '127.0.0.1', port: 1, requireTls: false, from: 'f@e.com' },
  tls: { ca: '', cert: '', key: '' },
  google: {
    clientId: 'google-client',
    clientSecret: 'google-secret',
    authorizeUrl: 'http://localhost:8090/google/authorize',
    tokenUrl: 'http://127.0.0.1:1/token',
    jwksUrl: 'http://127.0.0.1:1/jwks',
    issuers: ['http://issuer.test'],
  },
  facebook: {
    appId: 'fb-app',
    appSecret: 'fb-secret',
    authorizeUrl: 'http://localhost:8090/facebook/dialog/oauth',
    graphUrl: 'http://127.0.0.1:1/facebook',
    graphVersion: 'v23.0',
    scope: 'email',
  },
}

describe('createSocialProviders', () => {
  it('leaves a provider without credentials out', () => {
    expect(createSocialProviders({ ...config, google: null, facebook: null })).toEqual({ google: null, facebook: null })
  })

  const names: ('google' | 'facebook')[] = ['google', 'facebook']

  it.each(names)('joins the URL, the exchange and the validation of %s', async (name) => {
    const provider = createSocialProviders(config)[name]
    expect(provider?.buildAuthorizationUrl({ state: 's', challenge: 'c', nonce: 'n' })).toContain(
      `redirect_uri=${encodeURIComponent(`http://client.test/api/auth/${name}/callback`)}`,
    )
    await expect(provider?.fetchIdentity({ code: 'c', verifier: 'v', nonce: 'n' })).rejects.toThrow(
      ProviderUnavailableError,
    )
  })
})
