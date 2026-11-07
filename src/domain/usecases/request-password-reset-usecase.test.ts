import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeUser } from '../models/user-model.mock.js'
import { RequestPasswordResetUsecase, type RequestPasswordResetDependencies } from './request-password-reset-usecase.js'

const NOW = new Date('2026-01-01T10:00:00Z')
const user = makeUser()

describe('RequestPasswordResetUsecase', () => {
  let deps: RequestPasswordResetDependencies
  let task: () => Promise<void>

  beforeEach(() => {
    deps = {
      findUserByEmail: vi.fn(async () => user),
      incrementPasswordResetRequests: vi.fn(async () => 1),
      invalidatePasswordResetTokens: vi.fn(async () => undefined),
      generateResetToken: vi.fn(() => ({ token: 'raw', tokenHash: 'hashed' })),
      createPasswordResetToken: vi.fn(async () => undefined),
      sendPasswordResetEmail: vi.fn(async () => undefined),
      runInBackground: vi.fn((background) => {
        task = background
      }),
      now: () => NOW,
    }
  })

  it('does no work before answering', () => {
    new RequestPasswordResetUsecase(deps).execute({ email: 'ana@example.com' })
    expect(deps.findUserByEmail).not.toHaveBeenCalled()
  })

  it('invalidates the previous link and sends a 2 hour link', async () => {
    new RequestPasswordResetUsecase(deps).execute({ email: ' ANA@example.com', language: 'pt-BR' })
    await task()

    expect(deps.findUserByEmail).toHaveBeenCalledWith('ana@example.com')
    expect(deps.invalidatePasswordResetTokens).toHaveBeenCalledWith('u1', NOW)
    expect(deps.createPasswordResetToken).toHaveBeenCalledWith({
      userId: 'u1',
      tokenHash: 'hashed',
      expiresAt: new Date('2026-01-01T12:00:00Z'),
    })
    expect(deps.sendPasswordResetEmail).toHaveBeenCalledWith({ to: 'ana@example.com', language: 'pt-BR', token: 'raw' })
  })

  it('sends nothing for an unknown email', async () => {
    deps.findUserByEmail = vi.fn(async () => null)
    new RequestPasswordResetUsecase(deps).execute({ email: 'x@example.com' })
    await task()
    expect(deps.incrementPasswordResetRequests).not.toHaveBeenCalled()
    expect(deps.sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('still sends on the fifth request', async () => {
    deps.incrementPasswordResetRequests = vi.fn(async () => 5)
    new RequestPasswordResetUsecase(deps).execute({ email: 'ana@example.com' })
    await task()
    expect(deps.sendPasswordResetEmail).toHaveBeenCalled()
  })

  it('sends nothing on the sixth request and keeps the previous link', async () => {
    deps.incrementPasswordResetRequests = vi.fn(async () => 6)
    new RequestPasswordResetUsecase(deps).execute({ email: 'ana@example.com' })
    await task()
    expect(deps.invalidatePasswordResetTokens).not.toHaveBeenCalled()
    expect(deps.sendPasswordResetEmail).not.toHaveBeenCalled()
  })
})
