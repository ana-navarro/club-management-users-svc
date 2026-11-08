import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '../models/user-model.js'
import { makeUser } from '../models/user-model.mock.js'
import { ResendVerificationUsecase, type ResendVerificationDependencies } from './resend-verification-usecase.js'

const NOW = new Date('2026-01-01T10:00:00Z')
const unconfirmed = makeUser({ type: 'CLIENT', emailVerifiedAt: null, language: 'en' })

describe('ResendVerificationUsecase', () => {
  let deps: ResendVerificationDependencies
  let background: Array<() => Promise<void>>

  const run = async (user: User | null, language: 'pt-BR' | 'en' = 'pt-BR') => {
    deps.findUserByEmail = vi.fn(async () => user)
    new ResendVerificationUsecase(deps).execute({ email: ' Ana@Example.com ', language })
    await Promise.all(background.map((task) => task()))
  }

  beforeEach(() => {
    background = []
    deps = {
      findUserByEmail: vi.fn(async () => null),
      claimVerificationResend: vi.fn(async () => true),
      generateToken: vi.fn(() => ({ token: 'raw', tokenHash: 'hashed' })),
      createEmailVerificationToken: vi.fn(async () => undefined),
      sendVerificationEmail: vi.fn(async () => undefined),
      runInBackground: vi.fn((task) => {
        background.push(task)
      }),
      now: () => NOW,
    }
  })

  it('sends a new link to an unconfirmed client, in the saved language', async () => {
    await run(unconfirmed)
    expect(deps.findUserByEmail).toHaveBeenCalledWith('ana@example.com')
    expect(deps.sendVerificationEmail).toHaveBeenCalledWith({ to: 'ana@example.com', language: 'en', token: 'raw' })
  })

  it('sends nothing inside the 1 minute limit', async () => {
    deps.claimVerificationResend = vi.fn(async () => false)
    await run(unconfirmed)
    expect(deps.sendVerificationEmail).not.toHaveBeenCalled()
  })

  it.each([
    ['an unknown email', null],
    ['a confirmed client', makeUser({ type: 'CLIENT' })],
    ['an administrator', makeUser({ type: 'ADMIN', emailVerifiedAt: null })],
  ])('sends nothing for %s', async (_name, user) => {
    await run(user)
    expect(deps.claimVerificationResend).not.toHaveBeenCalled()
    expect(deps.sendVerificationEmail).not.toHaveBeenCalled()
  })
})
