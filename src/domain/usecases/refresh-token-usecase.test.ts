import { describe, expect, it, vi } from 'vitest'
import { InvalidTokenError } from '../models/auth-errors-model.js'
import type { TokenClaims } from '../models/session-model.js'
import type { User } from '../models/user-model.js'
import { RefreshTokenUsecase } from './refresh-token-usecase.js'

const STARTED = new Date('2026-01-01T08:00:00Z')

const user: User = {
  id: 'u1',
  name: 'New name',
  email: 'ana@example.com',
  passwordHash: 'hash',
  type: 'ADMIN',
  clubs: [{ id: 'c2', name: 'Club' }],
  theme: null,
  language: null,
  tokenVersion: 1,
  lockedUntil: null,
  knownNetworks: [],
}

const claims: TokenClaims = {
  userId: 'u1',
  name: 'Old name',
  email: 'ana@example.com',
  type: 'ADMIN',
  clubIds: [],
  tokenVersion: 1,
  sessionId: 's1',
  sessionStartedAt: STARTED,
}

const makeDeps = (now: string, found: User | null = user) => ({
  findUserById: vi.fn(async () => found),
  signToken: vi.fn(() => 'new-token'),
  now: () => new Date(now),
})

describe('RefreshTokenUsecase', () => {
  it('renews for 2 hours, keeping the session and reloading user data', async () => {
    const deps = makeDeps('2026-01-01T10:00:00Z')
    const result = await new RefreshTokenUsecase(deps).execute(claims)

    expect(result.expiresAt).toEqual(new Date('2026-01-01T12:00:00Z'))
    expect(result.renewAt).toEqual(new Date('2026-01-01T11:30:00Z'))
    expect(deps.signToken).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New name', clubIds: ['c2'], sessionId: 's1', sessionStartedAt: STARTED }),
      new Date('2026-01-01T10:00:00Z'),
      result.expiresAt,
    )
  })

  it('never goes past 12 hours from the login', async () => {
    const result = await new RefreshTokenUsecase(makeDeps('2026-01-01T19:00:00Z')).execute(claims)
    expect(result.expiresAt).toEqual(new Date('2026-01-01T20:00:00Z'))
    expect(result.renewAt).toEqual(result.expiresAt)
  })

  it('keeps two sessions independent', async () => {
    const deps = makeDeps('2026-01-01T10:00:00Z')
    const usecase = new RefreshTokenUsecase(deps)
    await usecase.execute(claims)
    await usecase.execute({ ...claims, sessionId: 's2' })
    expect(deps.signToken).toHaveBeenLastCalledWith(
      expect.objectContaining({ sessionId: 's2' }),
      expect.any(Date),
      expect.any(Date),
    )
  })

  it('rejects a token issued before a password change', async () => {
    const usecase = new RefreshTokenUsecase(makeDeps('2026-01-01T10:00:00Z'))
    await expect(usecase.execute({ ...claims, tokenVersion: 0 })).rejects.toThrow(InvalidTokenError)
  })

  it('rejects a user that no longer exists', async () => {
    const usecase = new RefreshTokenUsecase(makeDeps('2026-01-01T10:00:00Z', null))
    await expect(usecase.execute(claims)).rejects.toThrow(InvalidTokenError)
  })
})
