import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooManyRequestsError, WeakPasswordError } from '../models/auth-errors-model.js'
import type { User } from '../models/user-model.js'
import { makeUser } from '../models/user-model.mock.js'
import type { RegisterInput } from '../ports/registration-input-ports.js'
import { RegisterClientUsecase, type RegisterClientDependencies } from './register-client-usecase.js'

const NOW = new Date('2026-01-01T10:00:00Z')
const input: RegisterInput = {
  name: '  Ana  ',
  email: ' Ana@Example.com ',
  password: 'long-enough',
  language: 'pt-BR',
  ip: '203.0.113.7',
}
const client = makeUser({ type: 'CLIENT', emailVerifiedAt: null, language: null })

describe('RegisterClientUsecase', () => {
  let deps: RegisterClientDependencies
  let background: Array<() => Promise<void>>

  const flush = async () => {
    await Promise.all(background.map((task) => task()))
  }

  const withExisting = (existing: User) => {
    deps.createClientUser = vi.fn(async () => null)
    deps.findUserByEmail = vi.fn(async () => existing)
  }

  beforeEach(() => {
    background = []
    deps = {
      incrementRegistrationAttempts: vi.fn(async () => 1),
      hashNetwork: vi.fn((prefix: string) => `net:${prefix}`),
      hashPassword: vi.fn(async () => 'hash'),
      createClientUser: vi.fn(async () => client),
      findUserByEmail: vi.fn(async () => null),
      claimVerificationResend: vi.fn(async () => true),
      sendSignupAttemptEmail: vi.fn(async () => undefined),
      generateToken: vi.fn(() => ({ token: 'raw', tokenHash: 'hashed' })),
      createEmailVerificationToken: vi.fn(async () => undefined),
      sendVerificationEmail: vi.fn(async () => undefined),
      runInBackground: vi.fn((task) => {
        background.push(task)
      }),
      now: () => NOW,
    }
  })

  it('creates a client with the normalized email and sends a 24 hour link', async () => {
    await new RegisterClientUsecase(deps).execute(input)
    await flush()

    expect(deps.incrementRegistrationAttempts).toHaveBeenCalledWith('net:203.0.113', NOW)
    expect(deps.createClientUser).toHaveBeenCalledWith({
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: 'hash',
      language: 'pt-BR',
    })
    expect(deps.createEmailVerificationToken).toHaveBeenCalledWith({
      userId: 'u1',
      tokenHash: 'hashed',
      expiresAt: new Date('2026-01-02T10:00:00Z'),
      now: NOW,
    })
    expect(deps.sendVerificationEmail).toHaveBeenCalledWith({ to: 'ana@example.com', language: 'pt-BR', token: 'raw' })
  })

  it('resends the link to an existing unconfirmed client, within the 1 minute limit', async () => {
    withExisting(client)
    await new RegisterClientUsecase(deps).execute(input)
    await flush()
    expect(deps.claimVerificationResend).toHaveBeenCalledWith('u1', NOW)
    expect(deps.sendVerificationEmail).toHaveBeenCalledTimes(1)
    expect(deps.sendSignupAttemptEmail).not.toHaveBeenCalled()
  })

  it('sends nothing to an unconfirmed client inside the 1 minute limit', async () => {
    withExisting(client)
    deps.claimVerificationResend = vi.fn(async () => false)
    await new RegisterClientUsecase(deps).execute(input)
    await flush()
    expect(deps.sendVerificationEmail).not.toHaveBeenCalled()
  })

  it.each([
    ['a confirmed client', makeUser({ type: 'CLIENT', language: 'en' }), 'CLIENT', 'en'],
    ['an administrator', makeUser({ type: 'ADMIN' }), 'ADMIN', 'pt-BR'],
  ])('warns %s that someone tried to sign up', async (_name, existing, userType, language) => {
    withExisting(existing)
    await new RegisterClientUsecase(deps).execute(input)
    await flush()
    expect(deps.sendSignupAttemptEmail).toHaveBeenCalledWith({ to: 'ana@example.com', language, userType })
    expect(deps.sendVerificationEmail).not.toHaveBeenCalled()
  })

  it('answers the same way and hashes the password whether or not the account exists', async () => {
    const usecase = new RegisterClientUsecase(deps)
    await expect(usecase.execute(input)).resolves.toBeUndefined()
    withExisting(client)
    await expect(usecase.execute(input)).resolves.toBeUndefined()
    expect(deps.hashPassword).toHaveBeenCalledTimes(2)
  })

  it('does nothing in the background when the account vanished after the race', async () => {
    deps.createClientUser = vi.fn(async () => null)
    await new RegisterClientUsecase(deps).execute(input)
    await flush()
    expect(deps.sendVerificationEmail).not.toHaveBeenCalled()
    expect(deps.sendSignupAttemptEmail).not.toHaveBeenCalled()
  })

  it('refuses the eleventh sign-up of a network in the hour', async () => {
    deps.incrementRegistrationAttempts = vi.fn(async () => 11)
    await expect(new RegisterClientUsecase(deps).execute(input)).rejects.toThrow(TooManyRequestsError)
    expect(deps.createClientUser).not.toHaveBeenCalled()
  })

  it('does not limit a sign-up without an address', async () => {
    await new RegisterClientUsecase(deps).execute({ ...input, ip: undefined })
    expect(deps.incrementRegistrationAttempts).not.toHaveBeenCalled()
    expect(deps.createClientUser).toHaveBeenCalled()
  })

  it('refuses a password shorter than 8 characters', async () => {
    await expect(new RegisterClientUsecase(deps).execute({ ...input, password: 'short' })).rejects.toThrow(
      WeakPasswordError,
    )
    expect(deps.createClientUser).not.toHaveBeenCalled()
  })

  it('saves no language when the session has none', async () => {
    await new RegisterClientUsecase(deps).execute({ ...input, language: undefined })
    expect(deps.createClientUser).toHaveBeenCalledWith(expect.objectContaining({ language: null }))
  })
})
