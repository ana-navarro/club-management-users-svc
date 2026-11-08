import type { TokenClaims } from './session-model.js'
import type { User } from './user-model.js'

export const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'u1',
  name: 'Ana',
  email: 'ana@example.com',
  passwordHash: 'hash',
  type: 'ADMIN',
  clubs: [],
  theme: null,
  language: null,
  tokenVersion: 0,
  lockedUntil: null,
  knownNetworks: [],
  emailVerifiedAt: new Date('2026-01-01T00:00:00Z'),
  verificationEmailSentAt: null,
  socialIdentities: [],
  ...overrides,
})

export const makeClaims = (overrides: Partial<TokenClaims> = {}): TokenClaims => ({
  userId: 'u1',
  name: 'Ana',
  email: 'ana@example.com',
  type: 'ADMIN',
  clubIds: [],
  tokenVersion: 0,
  sessionId: 's1',
  sessionStartedAt: new Date('2026-01-01T08:00:00Z'),
  ...overrides,
})
