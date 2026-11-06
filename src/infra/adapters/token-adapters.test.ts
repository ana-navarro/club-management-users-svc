import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'
import { InvalidTokenError } from '../../domain/models/auth-errors-model.js'
import type { TokenClaims } from '../../domain/models/session-model.js'
import { createSignToken } from './sign-token-adapter.js'
import { createVerifyToken } from './verify-token-adapter.js'

const SECRET = 'test-secret-with-enough-length-for-hs256'
const claims: TokenClaims = {
  userId: 'u1',
  name: 'Ana',
  email: 'ana@example.com',
  type: 'ADMIN',
  clubIds: ['c1'],
  tokenVersion: 2,
  sessionId: 's1',
  sessionStartedAt: new Date('2026-01-01T10:00:00.000Z'),
}

const decode = (token: string): jwt.JwtPayload => {
  const decoded = jwt.decode(token)
  if (decoded === null || typeof decoded === 'string') throw new Error('Expected a token with a payload')
  return decoded
}

const inFuture = () => {
  const now = new Date()
  return { now, expiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000) }
}

describe('token adapters', () => {
  const sign = createSignToken(SECRET)
  const verify = createVerifyToken(SECRET)

  it('round trips the claims', () => {
    const { now, expiresAt } = inFuture()
    expect(verify(sign(claims, now, expiresAt))).toEqual(claims)
  })

  it('expires at the given time', () => {
    const { now, expiresAt } = inFuture()
    const decoded = decode(sign(claims, now, expiresAt))
    const issuedAt = Math.floor(now.getTime() / 1000)
    expect(decoded.iat).toBe(issuedAt)
    expect(decoded.exp).toBe(issuedAt + 7200)
  })

  it('rejects an expired token', () => {
    const past = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const token = sign(claims, past, new Date(past.getTime() + 60 * 60 * 1000))
    expect(() => verify(token)).toThrow(InvalidTokenError)
  })

  it('carries no sensitive data', () => {
    const { now, expiresAt } = inFuture()
    const decoded = decode(sign(claims, now, expiresAt))
    expect(Object.keys(decoded).sort()).toEqual(
      ['clubIds', 'email', 'exp', 'iat', 'jti', 'name', 'sessionStartedAt', 'sid', 'sub', 'tokenVersion', 'type'].sort(),
    )
  })

  it('makes different tokens in the same second', () => {
    const { now, expiresAt } = inFuture()
    const tokens = Array.from({ length: 1000 }, () => sign(claims, now, expiresAt))
    expect(new Set(tokens).size).toBe(1000)
  })

  it('rejects another secret, a forged algorithm and garbage', () => {
    const { now, expiresAt } = inFuture()
    expect(() => createVerifyToken('another-secret')(sign(claims, now, expiresAt))).toThrow(InvalidTokenError)
    const forged = jwt.sign({ sub: 'u1' }, '', { algorithm: 'none' })
    expect(() => verify(forged)).toThrow(InvalidTokenError)
    expect(() => verify('garbage')).toThrow(InvalidTokenError)
  })

  it('rejects a valid signature with an unexpected payload', () => {
    expect(() => verify(jwt.sign({ sub: 'u1' }, SECRET))).toThrow(InvalidTokenError)
  })
})
