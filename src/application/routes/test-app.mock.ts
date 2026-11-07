import { vi } from 'vitest'
import { InvalidTokenError } from '../../domain/models/auth-errors-model.js'
import type { PublicUser } from '../../domain/models/user-model.js'
import { makeClaims } from '../../domain/models/user-model.mock.js'
import { createApp, type AppUsecases } from '../../config/create-app-config.js'

export const claims = makeClaims()

export const publicUser: PublicUser = {
  id: 'u1',
  name: 'Ana',
  email: 'ana@example.com',
  type: 'ADMIN',
  clubs: [],
  preferences: { theme: null, language: null },
}

export const session = {
  token: 'jwt',
  expiresAt: new Date('2026-01-01T12:00:00.000Z'),
  renewAt: new Date('2026-01-01T11:30:00.000Z'),
}

export const makeUsecases = () => ({
  loginUser: { execute: vi.fn(async () => ({ ...session, user: publicUser })) },
  refreshToken: { execute: vi.fn(async () => session) },
  requestPasswordReset: { execute: vi.fn() },
  resetPassword: { execute: vi.fn(async () => undefined) },
  getCurrentUser: { execute: vi.fn(async () => publicUser) },
  updateUserPreferences: { execute: vi.fn(async () => publicUser) },
  verifyToken: vi.fn((token: string) => {
    if (token !== 'good') throw new InvalidTokenError()
    return claims
  }),
})

export const makeApp = (usecases: AppUsecases = makeUsecases()) => createApp(usecases)
