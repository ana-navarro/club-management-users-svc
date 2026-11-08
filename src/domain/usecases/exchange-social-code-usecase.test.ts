import { describe, expect, it, vi } from 'vitest'
import { InvalidSocialCodeError } from '../models/auth-errors-model.js'
import type { User } from '../models/user-model.js'
import { makeUser } from '../models/user-model.mock.js'
import { ExchangeSocialCodeUsecase, type ExchangeSocialCodeDependencies } from './exchange-social-code-usecase.js'

const NOW = new Date('2026-01-01T10:00:00Z')

const makeDeps = (userId: string | null, user: User | null): ExchangeSocialCodeDependencies => ({
  hashValue: (value) => `hash:${value}`,
  consumeSocialLoginCode: vi.fn(async () => userId),
  findUserById: vi.fn(async () => user),
  generateSessionId: () => 'session-1',
  signToken: vi.fn((claims) => `token-${claims.sessionId}`),
  now: () => NOW,
})

describe('ExchangeSocialCodeUsecase', () => {
  it('opens a session with a new session id and the 001 times', async () => {
    const deps = makeDeps('u1', makeUser({ type: 'CLIENT' }))
    const result = await new ExchangeSocialCodeUsecase(deps).execute({ code: 'c' })
    expect(deps.consumeSocialLoginCode).toHaveBeenCalledWith('hash:c', NOW)
    expect(result).toMatchObject({
      token: 'token-session-1',
      expiresAt: new Date('2026-01-01T12:00:00Z'),
      renewAt: new Date('2026-01-01T11:30:00Z'),
      user: { id: 'u1', type: 'CLIENT' },
    })
    expect(result.user).not.toHaveProperty('passwordHash')
    expect(deps.signToken).toHaveBeenCalledWith(expect.objectContaining({ sessionStartedAt: NOW }), NOW, result.expiresAt)
  })

  it.each([
    ['an unknown, expired or used code', null, null],
    ['a deleted user', 'u1', null],
    ['an administrator', 'u1', makeUser({ type: 'ADMIN' })],
  ])('refuses %s', async (_name, userId, user) => {
    await expect(new ExchangeSocialCodeUsecase(makeDeps(userId, user)).execute({ code: 'c' })).rejects.toThrow(
      InvalidSocialCodeError,
    )
  })
})
