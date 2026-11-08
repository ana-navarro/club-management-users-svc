import { vi } from 'vitest'
import type { ProviderIdentity, SocialIdentity } from '../models/social-identity-model.js'
import type { Language, User } from '../models/user-model.js'
import { makeUser } from '../models/user-model.mock.js'
import type { SocialLinkRequest } from '../ports/social-login-output-ports.js'
import type { CompleteSocialLoginDependencies } from './complete-social-login-usecase.js'
import type { ConfirmSocialLinkDependencies } from './confirm-social-link-usecase.js'

export const NOW = new Date('2026-01-01T10:00:00Z')
const SESSION_LANGUAGE: Language = 'pt-BR'

export const googleIdentity = (overrides: Partial<ProviderIdentity> = {}): ProviderIdentity => ({
  provider: 'google',
  subject: 'g1',
  email: 'Ana@Example.com',
  emailVerified: true,
  name: 'Ana',
  ...overrides,
})

export const facebookIdentity = (overrides: Partial<ProviderIdentity> = {}): ProviderIdentity => ({
  provider: 'facebook',
  subject: 'f1',
  email: 'ana@example.com',
  emailVerified: false,
  name: 'Ana FB',
  ...overrides,
})

// A small in-memory user store, so the usecases run against consistent data.
export function makeUserStore(initial: User[] = []) {
  const users = new Map(initial.map((user) => [user.id, user]))
  let next = 100

  const byEmail = (email: string) => [...users.values()].find((user) => user.email === email) ?? null
  const byIdentity = (provider: string, subject: string) =>
    [...users.values()].find((user) =>
      user.socialIdentities.some((identity) => identity.provider === provider && identity.subject === subject),
    ) ?? null
  const update = (id: string, change: Partial<User>) => {
    const user = users.get(id)
    if (user) users.set(id, { ...user, ...change })
  }

  return {
    users,
    findUserByEmail: vi.fn(async (email: string) => byEmail(email)),
    findUserById: vi.fn(async (id: string) => users.get(id) ?? null),
    findUserBySocialIdentity: vi.fn(async (provider: string, subject: string) => byIdentity(provider, subject)),
    linkSocialIdentity: vi.fn(async (userId: string, identity: SocialIdentity) => {
      const user = users.get(userId)
      if (!user || user.socialIdentities.some((current) => current.provider === identity.provider)) return false
      if (byIdentity(identity.provider, identity.subject)) return false
      update(userId, { socialIdentities: [...user.socialIdentities, identity] })
      return true
    }),
    replaceSocialIdentity: vi.fn(async (userId: string, identity: SocialIdentity) => {
      const user = users.get(userId)
      if (!user || byIdentity(identity.provider, identity.subject)) return false
      const others = user.socialIdentities.filter((current) => current.provider !== identity.provider)
      update(userId, { socialIdentities: [...others, identity] })
      return true
    }),
    claimUnverifiedAccount: vi.fn(async (userId: string, now: Date) => {
      const user = users.get(userId)
      if (!user || user.emailVerifiedAt !== null) return false
      update(userId, { emailVerifiedAt: now, passwordHash: null, tokenVersion: user.tokenVersion + 1 })
      return true
    }),
    createSocialClientUser: vi.fn(
      async (input: { name: string; email: string; identity: SocialIdentity; language: User['language']; now: Date }) => {
        if (byEmail(input.email)) return null
        const user = makeUser({
          id: `u${next++}`,
          name: input.name,
          email: input.email,
          type: 'CLIENT',
          passwordHash: null,
          emailVerifiedAt: input.now,
          language: input.language,
          socialIdentities: [input.identity],
          knownNetworks: [],
        })
        users.set(user.id, user)
        return user
      },
    ),
    invalidateEmailVerificationTokens: vi.fn(async () => undefined),
    invalidatePasswordResetTokens: vi.fn(async () => undefined),
  }
}

export type UserStore = ReturnType<typeof makeUserStore>

export function makeCompleteDeps(store: UserStore, identity: ProviderIdentity = googleIdentity()) {
  const background: Array<() => Promise<void>> = []
  const fetchIdentity = vi.fn(async () => identity)
  const provider = { buildAuthorizationUrl: vi.fn(() => 'url'), fetchIdentity }
  const deps: CompleteSocialLoginDependencies = {
    ...store,
    providers: { google: provider, facebook: provider },
    hashValue: (value: string) => `hash:${value}`,
    consumeOAuthState: vi.fn(async () => ({ codeVerifier: 'verifier', nonce: 'nonce', language: SESSION_LANGUAGE })),
    generateToken: vi.fn(() => ({ token: 'raw', tokenHash: 'hashed' })),
    createSocialLoginCode: vi.fn(async () => undefined),
    incrementSocialLinkAttempts: vi.fn(async () => 1),
    countRecentSocialLinkRequests: vi.fn(async () => 0),
    createSocialLinkRequest: vi.fn(async () => undefined),
    sendSocialLinkEmail: vi.fn(async () => undefined),
    hashNetwork: (prefix: string) => `net:${prefix}`,
    addKnownNetwork: vi.fn(async () => undefined),
    generateResetToken: vi.fn(() => ({ token: 'reset', tokenHash: 'reset-hash' })),
    createPasswordResetToken: vi.fn(async () => undefined),
    sendNewLocationEmail: vi.fn(async () => undefined),
    runInBackground: vi.fn((task: () => Promise<void>) => {
      background.push(task)
    }),
    now: () => NOW,
  }
  const flush = () => Promise.all(background.map((task) => task()))
  return { deps, fetchIdentity, background, flush }
}

export const linkRequest = (overrides: Partial<SocialLinkRequest> = {}): SocialLinkRequest => ({
  id: 'r1',
  provider: 'facebook',
  subject: 'f1',
  email: 'ana@example.com',
  profileName: 'Ana FB',
  language: 'en',
  ...overrides,
})

export function makeConfirmDeps(store: UserStore, request: SocialLinkRequest | null = linkRequest()) {
  const deps: ConfirmSocialLinkDependencies = {
    ...store,
    hashValue: (value: string) => `hash:${value}`,
    consumeSocialLinkRequest: vi.fn(async () => request),
    now: () => NOW,
  }
  return deps
}

export const client = (overrides: Partial<User> = {}): User =>
  makeUser({ id: 'u1', type: 'CLIENT', emailVerifiedAt: NOW, knownNetworks: ['net:203.0.113'], ...overrides })
