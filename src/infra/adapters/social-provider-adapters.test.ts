import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FacebookConfig, GoogleConfig } from '../../config/load-env-config.js'
import { ProviderUnavailableError } from '../../domain/models/auth-errors-model.js'
import { createBuildFacebookAuthorizationUrl } from './build-facebook-authorization-url-adapter.js'
import { createBuildGoogleAuthorizationUrl } from './build-google-authorization-url-adapter.js'
import { createExchangeFacebookCode } from './exchange-facebook-code-adapter.js'
import { createExchangeGoogleCode } from './exchange-google-code-adapter.js'
import { generateNonce } from './generate-nonce-adapter.js'
import { generateOAuthState } from './generate-oauth-state-adapter.js'
import { generatePkce } from './generate-pkce-adapter.js'
import { createAppSecretProof, createGetFacebookProfile } from './get-facebook-profile-adapter.js'
import { createVerifyGoogleIdToken } from './verify-google-id-token-adapter.js'

type Reply = { status: number; body: object | string }
type Seen = { method: string; url: string; body: string }

const CLIENT_APP = 'http://localhost:8080'
const ISSUER = 'http://issuer.test/google'

let server: Server
let base = ''
let reply: (request: Seen) => Reply = () => ({ status: 404, body: {} })
const seen: Seen[] = []
const keys = await generateKeyPair('RS256')
const otherKeys = await generateKeyPair('RS256')

const handle = (request: IncomingMessage, response: ServerResponse) => {
  let body = ''
  request.on('data', (chunk: Buffer) => {
    body += chunk.toString()
  })
  request.on('end', () => {
    const entry = { method: request.method ?? '', url: request.url ?? '', body }
    seen.push(entry)
    const { status, body: answer } = entry.url === '/jwks' ? jwks : reply(entry)
    response.writeHead(status, { 'content-type': 'application/json' })
    response.end(typeof answer === 'string' ? answer : JSON.stringify(answer))
  })
}

let jwks: Reply = { status: 200, body: { keys: [] } }

beforeAll(async () => {
  jwks = { status: 200, body: { keys: [{ ...(await exportJWK(keys.publicKey)), kid: 'k1', alg: 'RS256' }] } }
  server = createServer(handle)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address: AddressInfo | string | null = server.address()
  if (!address || typeof address === 'string') throw new Error('No port')
  base = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

beforeEach(() => {
  seen.length = 0
})

const google = (): GoogleConfig => ({
  clientId: 'google-client',
  clientSecret: 'google-secret',
  authorizeUrl: 'http://localhost:8090/google/authorize',
  tokenUrl: `${base}/token`,
  jwksUrl: `${base}/jwks`,
  issuers: [ISSUER, 'accounts.google.com'],
})

const facebook = (): FacebookConfig => ({
  appId: 'fb-app',
  appSecret: 'fb-secret',
  authorizeUrl: 'http://localhost:8090/facebook/dialog/oauth',
  graphUrl: `${base}/facebook/`,
  graphVersion: 'v23.0',
  scope: 'email,public_profile',
})

type SignOptions = { key?: CryptoKey; expiresIn?: string; issuer?: string; audience?: string }

const signIdToken = (claims: JWTPayload, options: SignOptions = {}) =>
  new SignJWT({ email: 'ana@example.com', email_verified: true, name: 'Ana', nonce: 'n1', ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setSubject('google-subject')
    .setIssuer(options.issuer ?? ISSUER)
    .setAudience(options.audience ?? 'google-client')
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? '5m')
    .sign(options.key ?? keys.privateKey)

describe('random values', () => {
  it('creates a PKCE pair with an S256 challenge', async () => {
    const { verifier, challenge } = generatePkce()
    const digest = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
    expect(verifier).toMatch(/^[\w-]{43}$/)
    expect(challenge).toBe(digest.toString('base64url'))
  })

  it('creates different states and nonces', () => {
    expect(generateOAuthState()).not.toBe(generateOAuthState())
    expect(generateNonce()).not.toBe(generateNonce())
  })
})

describe('authorization URLs', () => {
  it('builds the Google URL with PKCE, nonce and account choice', () => {
    const url = new URL(
      createBuildGoogleAuthorizationUrl(google(), `${CLIENT_APP}/`)({ state: 's', challenge: 'c', nonce: 'n' }),
    )
    expect(url.origin + url.pathname).toBe('http://localhost:8090/google/authorize')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'google-client',
      redirect_uri: 'http://localhost:8080/api/auth/google/callback',
      response_type: 'code',
      scope: 'openid email profile',
      state: 's',
      code_challenge: 'c',
      code_challenge_method: 'S256',
      nonce: 'n',
      prompt: 'select_account',
    })
  })

  it('builds the Facebook URL with the scope and without a nonce', () => {
    const url = new URL(createBuildFacebookAuthorizationUrl(facebook(), CLIENT_APP)({ state: 's', challenge: 'c', nonce: 'n' }))
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:8080/api/auth/facebook/callback')
    expect(url.searchParams.get('scope')).toBe('email,public_profile')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.has('nonce')).toBe(false)
  })
})

describe('Google', () => {
  it('exchanges the code with the secret and the verifier', async () => {
    reply = () => ({ status: 200, body: { id_token: 'token', access_token: 'a' } })
    await expect(createExchangeGoogleCode(google(), CLIENT_APP)({ code: 'c', verifier: 'v' })).resolves.toBe('token')
    const params = new URLSearchParams(seen[0]?.body)
    expect(seen[0]?.method).toBe('POST')
    expect(Object.fromEntries(params)).toMatchObject({
      grant_type: 'authorization_code',
      code: 'c',
      client_id: 'google-client',
      client_secret: 'google-secret',
      code_verifier: 'v',
      redirect_uri: 'http://localhost:8080/api/auth/google/callback',
    })
  })

  it.each<Reply>([
    { status: 400, body: { error: 'invalid_grant' } },
    { status: 200, body: { access_token: 'no id token' } },
    { status: 200, body: 'not json' },
  ])('turns a failed exchange into provider_unavailable (%j)', async (answer) => {
    reply = () => answer
    await expect(createExchangeGoogleCode(google(), CLIENT_APP)({ code: 'c', verifier: 'v' })).rejects.toThrow(
      ProviderUnavailableError,
    )
  })

  it('turns a network failure into provider_unavailable', async () => {
    const config = { ...google(), tokenUrl: 'http://127.0.0.1:1/token' }
    await expect(createExchangeGoogleCode(config, CLIENT_APP)({ code: 'c', verifier: 'v' })).rejects.toThrow(
      ProviderUnavailableError,
    )
  })

  it('validates the id_token and reads the identity', async () => {
    const identity = await createVerifyGoogleIdToken(google())({ idToken: await signIdToken({}), nonce: 'n1' })
    expect(identity).toEqual({
      provider: 'google',
      subject: 'google-subject',
      email: 'ana@example.com',
      emailVerified: true,
      name: 'Ana',
    })
  })

  it('reads a string email_verified and a missing email', async () => {
    const verify = createVerifyGoogleIdToken(google())
    const token = await signIdToken({ email_verified: 'false', email: undefined, name: undefined })
    await expect(verify({ idToken: token, nonce: 'n1' })).resolves.toMatchObject({
      email: null,
      emailVerified: false,
      name: '',
    })
  })

  it.each([
    ['a forged signature', () => signIdToken({}, { key: otherKeys.privateKey })],
    ['an expired token', () => signIdToken({}, { expiresIn: '-1m' })],
    ['another audience', () => signIdToken({}, { audience: 'someone-else' })],
    ['another issuer', () => signIdToken({}, { issuer: 'http://evil.test' })],
    ['another nonce', () => signIdToken({ nonce: 'other' })],
    ['no nonce', () => signIdToken({ nonce: undefined })],
    ['garbage', async () => 'not.a.token'],
  ])('refuses %s', async (_name, makeToken) => {
    await expect(createVerifyGoogleIdToken(google())({ idToken: await makeToken(), nonce: 'n1' })).rejects.toThrow(
      ProviderUnavailableError,
    )
  })

  it('refuses a token when the attempt had no nonce', async () => {
    await expect(createVerifyGoogleIdToken(google())({ idToken: await signIdToken({}), nonce: null })).rejects.toThrow(
      ProviderUnavailableError,
    )
  })
})

describe('Facebook', () => {
  it('exchanges the code on the versioned Graph API', async () => {
    reply = () => ({ status: 200, body: { access_token: 'fb-token', token_type: 'bearer' } })
    await expect(createExchangeFacebookCode(facebook(), CLIENT_APP)({ code: 'c', verifier: 'v' })).resolves.toBe(
      'fb-token',
    )
    const url = new URL(seen[0]?.url ?? '', base)
    expect(url.pathname).toBe('/facebook/v23.0/oauth/access_token')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: 'fb-app',
      client_secret: 'fb-secret',
      code: 'c',
      code_verifier: 'v',
      redirect_uri: 'http://localhost:8080/api/auth/facebook/callback',
    })
  })

  it('reads the profile with the appsecret_proof, never as a verified email', async () => {
    reply = () => ({ status: 200, body: { id: 'fb-id', name: 'Ana FB', email: 'ana@example.com' } })
    const identity = await createGetFacebookProfile(facebook())('fb-token')
    expect(identity).toEqual({
      provider: 'facebook',
      subject: 'fb-id',
      email: 'ana@example.com',
      emailVerified: false,
      name: 'Ana FB',
    })
    const url = new URL(seen[0]?.url ?? '', base)
    expect(url.pathname).toBe('/facebook/v23.0/me')
    expect(url.searchParams.get('fields')).toBe('id,name,email')
    expect(url.searchParams.get('appsecret_proof')).toBe(createAppSecretProof('fb-secret', 'fb-token'))
    expect(createAppSecretProof('fb-secret', 'fb-token')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('reads a profile without email or name', async () => {
    reply = () => ({ status: 200, body: { id: 'fb-id' } })
    await expect(createGetFacebookProfile(facebook())('fb-token')).resolves.toMatchObject({ email: null, name: '' })
  })

  it.each<Reply>([
    { status: 400, body: { error: { message: 'Invalid appsecret_proof' } } },
    { status: 200, body: { name: 'no id' } },
  ])('turns a refused or malformed profile into provider_unavailable (%j)', async (answer) => {
    reply = () => answer
    await expect(createGetFacebookProfile(facebook())('fb-token')).rejects.toThrow(ProviderUnavailableError)
  })

  it('turns a failed exchange into provider_unavailable', async () => {
    reply = () => ({ status: 500, body: {} })
    await expect(createExchangeFacebookCode(facebook(), CLIENT_APP)({ code: 'c', verifier: 'v' })).rejects.toThrow(
      ProviderUnavailableError,
    )
  })
})
