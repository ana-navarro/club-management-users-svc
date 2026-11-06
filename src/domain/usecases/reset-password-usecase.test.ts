import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InvalidResetLinkError, WeakPasswordError } from '../models/auth-errors-model.js'
import type { PasswordResetToken } from '../ports/auth-output-ports.js'
import { ResetPasswordUsecase, type ResetPasswordDependencies } from './reset-password-usecase.js'

const NOW = new Date('2026-01-01T10:00:00Z')
const valid: PasswordResetToken = {
  id: 't1',
  userId: 'u1',
  expiresAt: new Date('2026-01-01T11:00:00Z'),
  usedAt: null,
}

describe('ResetPasswordUsecase', () => {
  let deps: ResetPasswordDependencies

  beforeEach(() => {
    deps = {
      hashResetToken: vi.fn((token: string) => `hash:${token}`),
      findPasswordResetToken: vi.fn(async () => valid),
      markPasswordResetTokenUsed: vi.fn(async () => true),
      invalidatePasswordResetTokens: vi.fn(async () => undefined),
      hashPassword: vi.fn(async () => 'new-hash'),
      updateUserPassword: vi.fn(async () => undefined),
      now: () => NOW,
    }
  })

  it('changes the password and spends the link', async () => {
    await new ResetPasswordUsecase(deps).execute({ token: 'raw', password: 'long-enough' })

    expect(deps.findPasswordResetToken).toHaveBeenCalledWith('hash:raw')
    expect(deps.markPasswordResetTokenUsed).toHaveBeenCalledWith('t1', NOW)
    expect(deps.updateUserPassword).toHaveBeenCalledWith('u1', 'new-hash')
    expect(deps.invalidatePasswordResetTokens).toHaveBeenCalledWith('u1', NOW)
  })

  it('does not spend the link when the password is refused', async () => {
    await expect(new ResetPasswordUsecase(deps).execute({ token: 'raw', password: 'short' })).rejects.toThrow(
      WeakPasswordError,
    )
    expect(deps.markPasswordResetTokenUsed).not.toHaveBeenCalled()
  })

  it.each([
    ['unknown', null],
    ['used', { ...valid, usedAt: NOW }],
    ['expired', { ...valid, expiresAt: NOW }],
  ])('rejects a link that is %s', async (_name, token) => {
    deps.findPasswordResetToken = vi.fn(async () => token)
    await expect(new ResetPasswordUsecase(deps).execute({ token: 'raw', password: 'long-enough' })).rejects.toThrow(
      InvalidResetLinkError,
    )
    expect(deps.updateUserPassword).not.toHaveBeenCalled()
  })

  it('rejects the loser of two simultaneous uses', async () => {
    deps.markPasswordResetTokenUsed = vi.fn(async () => false)
    await expect(new ResetPasswordUsecase(deps).execute({ token: 'raw', password: 'long-enough' })).rejects.toThrow(
      InvalidResetLinkError,
    )
    expect(deps.updateUserPassword).not.toHaveBeenCalled()
  })
})
