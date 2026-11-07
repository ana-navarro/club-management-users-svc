import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InvalidCredentialsError } from '../models/auth-errors-model.js'
import type { User } from '../models/user-model.js'
import type { LoginInput } from '../ports/auth-input-ports.js'
import { LoginUserUsecase, type LoginUserDependencies } from './login-user-usecase.js'

const NOW = new Date('2026-01-01T10:00:00Z')

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'u1',
  name: 'Ana',
  email: 'ana@example.com',
  passwordHash: 'hash',
  type: 'ADMIN',
  clubs: [{ id: 'c1', name: 'Club' }],
  theme: null,
  language: null,
  tokenVersion: 0,
  lockedUntil: null,
  knownNetworks: ['net:10.0.0'],
  ...overrides,
})

const input: LoginInput = { email: 'Ana@Example.com', password: 'right-password', userType: 'ADMIN', ip: '10.0.0.5' }

describe('LoginUserUsecase', () => {
  let deps: LoginUserDependencies
  let background: Array<() => Promise<void>>
  let tokenCount: number

  const flush = async () => {
    await Promise.all(background.map((task) => task()))
  }

  beforeEach(() => {
    background = []
    tokenCount = 0
    deps = {
      findUserByEmail: vi.fn(async () => makeUser()),
      verifyPassword: vi.fn(async (_hash, password) => password === 'right-password'),
      recordFailedLogin: vi.fn(async () => ({ locked: false })),
      clearFailedLogins: vi.fn(async () => undefined),
      addKnownNetwork: vi.fn(async () => undefined),
      hashNetwork: vi.fn((prefix: string) => `net:${prefix}`),
      generateResetToken: vi.fn(() => ({ token: 'link-token', tokenHash: 'link-hash' })),
      createPasswordResetToken: vi.fn(async () => undefined),
      sendLoginAttemptsEmail: vi.fn(async () => undefined),
      sendNewLocationEmail: vi.fn(async () => undefined),
      generateSessionId: vi.fn(() => `session-${++tokenCount}`),
      signToken: vi.fn((claims) => `token-${claims.sessionId}`),
      runInBackground: vi.fn((task) => {
        background.push(task)
      }),
      now: () => NOW,
      dummyPasswordHash: 'dummy',
    }
  })

  it('returns a session and the public user for the right password', async () => {
    const result = await new LoginUserUsecase(deps).execute(input)

    expect(deps.findUserByEmail).toHaveBeenCalledWith('ana@example.com')
    expect(result.token).toBe('token-session-1')
    expect(result.expiresAt).toEqual(new Date('2026-01-01T12:00:00Z'))
    expect(result.renewAt).toEqual(new Date('2026-01-01T11:30:00Z'))
    expect(result.user).not.toHaveProperty('passwordHash')
    expect(deps.clearFailedLogins).toHaveBeenCalledWith('u1')
  })

  it('opens a different session on each login', async () => {
    const usecase = new LoginUserUsecase(deps)
    const first = await usecase.execute(input)
    const second = await usecase.execute(input)
    expect(first.token).not.toBe(second.token)
  })

  it('counts a wrong password without an email before the third failure', async () => {
    await expect(new LoginUserUsecase(deps).execute({ ...input, password: 'wrong' })).rejects.toThrow(
      InvalidCredentialsError,
    )
    expect(deps.recordFailedLogin).toHaveBeenCalledWith('u1', NOW)
    expect(background).toHaveLength(0)
  })

  it('sends one email with a 2 hour link on the failure that locks the account', async () => {
    deps.recordFailedLogin = vi.fn(async () => ({ locked: true }))
    await expect(new LoginUserUsecase(deps).execute({ ...input, password: 'wrong' })).rejects.toThrow(
      InvalidCredentialsError,
    )
    await flush()

    expect(deps.createPasswordResetToken).toHaveBeenCalledWith({
      userId: 'u1',
      tokenHash: 'link-hash',
      expiresAt: new Date('2026-01-01T12:00:00Z'),
    })
    expect(deps.sendLoginAttemptsEmail).toHaveBeenCalledWith({
      to: 'ana@example.com',
      language: 'en',
      token: 'link-token',
      attempts: 3,
    })
  })

  it('refuses the right password while locked, without counting or emailing', async () => {
    deps.findUserByEmail = vi.fn(async () => makeUser({ lockedUntil: new Date('2026-01-01T10:10:00Z') }))
    await expect(new LoginUserUsecase(deps).execute(input)).rejects.toThrow(InvalidCredentialsError)
    expect(deps.recordFailedLogin).not.toHaveBeenCalled()
    expect(background).toHaveLength(0)
  })

  it('accepts the login after the lock ends', async () => {
    deps.findUserByEmail = vi.fn(async () => makeUser({ lockedUntil: new Date('2026-01-01T09:59:00Z') }))
    await expect(new LoginUserUsecase(deps).execute(input)).resolves.toHaveProperty('token')
  })

  it('checks the password against a fixed hash for unknown emails', async () => {
    deps.findUserByEmail = vi.fn(async () => null)
    await expect(new LoginUserUsecase(deps).execute(input)).rejects.toThrow(InvalidCredentialsError)
    expect(deps.verifyPassword).toHaveBeenCalledWith('dummy', 'right-password')
    expect(background).toHaveLength(0)
  })

  it('refuses another user type with the same error, without counting a failure', async () => {
    deps.findUserByEmail = vi.fn(async () => makeUser({ type: 'CLIENT' }))
    await expect(new LoginUserUsecase(deps).execute(input)).rejects.toThrow(InvalidCredentialsError)
    expect(deps.recordFailedLogin).not.toHaveBeenCalled()
  })

  it('stays silent on a known network', async () => {
    await new LoginUserUsecase(deps).execute(input)
    expect(deps.addKnownNetwork).not.toHaveBeenCalled()
    expect(background).toHaveLength(0)
  })

  it('warns about a new network, in the saved language', async () => {
    deps.findUserByEmail = vi.fn(async () => makeUser({ language: 'pt-BR' }))
    await new LoginUserUsecase(deps).execute({ ...input, ip: '200.1.2.3', userAgent: 'Firefox', language: 'en' })
    await flush()

    expect(deps.addKnownNetwork).toHaveBeenCalledWith('u1', 'net:200.1.2')
    expect(deps.sendNewLocationEmail).toHaveBeenCalledWith({
      to: 'ana@example.com',
      language: 'pt-BR',
      token: 'link-token',
      when: NOW,
      userAgent: 'Firefox',
    })
  })

  it('does not warn on the first login of the account', async () => {
    deps.findUserByEmail = vi.fn(async () => makeUser({ knownNetworks: [] }))
    await new LoginUserUsecase(deps).execute(input)
    expect(deps.addKnownNetwork).toHaveBeenCalledWith('u1', 'net:10.0.0')
    expect(background).toHaveLength(0)
  })

  it('skips the network check without a client address', async () => {
    await new LoginUserUsecase(deps).execute({ ...input, ip: undefined })
    expect(deps.hashNetwork).not.toHaveBeenCalled()
  })
})
