import { expect, it, vi } from 'vitest'
import { InvalidVerificationLinkError } from '../models/auth-errors-model.js'
import { VerifyEmailUsecase, type VerifyEmailDependencies } from './verify-email-usecase.js'

const NOW = new Date('2026-01-01T10:00:00Z')

const makeDeps = (userId: string | null): VerifyEmailDependencies => ({
  hashToken: vi.fn((token: string) => `hash:${token}`),
  consumeEmailVerificationToken: vi.fn(async () => userId),
  markEmailVerified: vi.fn(async () => undefined),
  now: () => NOW,
})

it('spends the link and confirms the email', async () => {
  const deps = makeDeps('u1')
  await new VerifyEmailUsecase(deps).execute({ token: 'raw' })
  expect(deps.consumeEmailVerificationToken).toHaveBeenCalledWith('hash:raw', NOW)
  expect(deps.markEmailVerified).toHaveBeenCalledWith('u1', NOW)
})

it('refuses an unknown, expired or used link', async () => {
  const deps = makeDeps(null)
  await expect(new VerifyEmailUsecase(deps).execute({ token: 'raw' })).rejects.toThrow(InvalidVerificationLinkError)
  expect(deps.markEmailVerified).not.toHaveBeenCalled()
})
