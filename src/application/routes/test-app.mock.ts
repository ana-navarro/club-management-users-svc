import request from 'supertest'
import type { Express } from 'express'
import { vi } from 'vitest'
import { InvalidTokenError } from '../../domain/models/auth-errors-model.js'
import type { PublicUser, UserType } from '../../domain/models/user-model.js'
import { makeClaims } from '../../domain/models/user-model.mock.js'
import { createApp, type AppUsecases } from '../../config/create-app-config.js'
import type { CompleteSocialLoginOutput, SocialLinkPreview } from '../../domain/ports/social-login-input-ports.js'

export const claims = makeClaims()

export const publicUser: PublicUser = {
  id: 'u1',
  name: 'Ana',
  email: 'ana@example.com',
  type: 'ADMIN',
  clubs: [],
  preferences: { theme: null, language: null },
}

export const clientUser: PublicUser = { ...publicUser, type: 'CLIENT' }

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
  registerClient: { execute: vi.fn(async () => undefined) },
  verifyEmail: { execute: vi.fn(async () => undefined) },
  resendVerification: { execute: vi.fn() },
  startSocialLogin: { execute: vi.fn(async () => ({ url: 'https://provider.test/authorize' })) },
  completeSocialLogin: {
    execute: vi.fn(async (): Promise<CompleteSocialLoginOutput> => ({ status: 'session', code: 'exchange-code' })),
  },
  exchangeSocialCode: { execute: vi.fn(async () => ({ ...session, user: clientUser })) },
  previewSocialLink: {
    execute: vi.fn(
      async (): Promise<SocialLinkPreview> => ({ provider: 'facebook', profileName: 'Ana FB', email: 'ana@example.com' }),
    ),
  },
  confirmSocialLink: { execute: vi.fn(async () => undefined) },
  declineSocialLink: { execute: vi.fn(async () => undefined) },
  verifyToken: vi.fn((token: string) => {
    if (token !== 'good') throw new InvalidTokenError()
    return claims
  }),
})

export const makeApp = (usecases: AppUsecases = makeUsecases()) => createApp(usecases)

// Calls the app as a BFF would, with the X-App-Type header.
export const call = (app: Express, appType: UserType = 'ADMIN') => request.agent(app).set('x-app-type', appType)
