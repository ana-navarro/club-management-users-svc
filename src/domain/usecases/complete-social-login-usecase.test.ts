import { describe, expect, it, vi } from 'vitest'
import {
  EmailRequiredError,
  InvalidCredentialsError,
  InvalidStateError,
  ProviderUnavailableError,
  SocialLoginCancelledError,
} from '../models/auth-errors-model.js'
import { makeUser } from '../models/user-model.mock.js'
import type { CompleteSocialLoginInput } from '../ports/social-login-input-ports.js'
import { CompleteSocialLoginUsecase } from './complete-social-login-usecase.js'
import {
  NOW,
  client,
  facebookIdentity,
  googleIdentity,
  makeCompleteDeps,
  makeUserStore,
} from './social-login-fakes.mock.js'

const input = (overrides: Partial<CompleteSocialLoginInput> = {}): CompleteSocialLoginInput => ({
  provider: 'google',
  binding: 'b',
  state: 's',
  code: 'c',
  ip: '203.0.113.7',
  userAgent: 'Firefox',
  ...overrides,
})

describe('CompleteSocialLoginUsecase', () => {
  describe('the attempt and the provider answer', () => {
    it('spends the attempt with hashes of the state and of the binding', async () => {
      const { deps } = makeCompleteDeps(makeUserStore())
      await new CompleteSocialLoginUsecase(deps).execute(input())
      expect(deps.consumeOAuthState).toHaveBeenCalledWith({
        stateHash: 'hash:s',
        bindingHash: 'hash:b',
        provider: 'google',
        now: NOW,
      })
    })

    it('refuses a repeated, forged or expired attempt before calling the provider', async () => {
      const { deps, fetchIdentity } = makeCompleteDeps(makeUserStore())
      deps.consumeOAuthState = vi.fn(async () => null)
      await expect(new CompleteSocialLoginUsecase(deps).execute(input())).rejects.toThrow(InvalidStateError)
      expect(fetchIdentity).not.toHaveBeenCalled()
    })

    it('tells a cancel apart from other provider errors', async () => {
      const usecase = new CompleteSocialLoginUsecase(makeCompleteDeps(makeUserStore()).deps)
      await expect(usecase.execute(input({ error: 'access_denied', code: undefined }))).rejects.toThrow(
        SocialLoginCancelledError,
      )
      await expect(usecase.execute(input({ error: 'server_error', code: undefined }))).rejects.toThrow(
        ProviderUnavailableError,
      )
      await expect(usecase.execute(input({ code: undefined }))).rejects.toThrow(ProviderUnavailableError)
    })

    it('passes the PKCE verifier and the nonce of the attempt to the provider', async () => {
      const { deps, fetchIdentity } = makeCompleteDeps(makeUserStore())
      await new CompleteSocialLoginUsecase(deps).execute(input())
      expect(fetchIdentity).toHaveBeenCalledWith({ code: 'c', verifier: 'verifier', nonce: 'nonce' })
    })

    it('answers provider_unavailable when the provider fails or is not configured', async () => {
      const { deps, fetchIdentity } = makeCompleteDeps(makeUserStore())
      fetchIdentity.mockRejectedValue(new ProviderUnavailableError())
      await expect(new CompleteSocialLoginUsecase(deps).execute(input())).rejects.toThrow(ProviderUnavailableError)

      deps.providers = { google: null, facebook: null }
      await expect(new CompleteSocialLoginUsecase(deps).execute(input())).rejects.toMatchObject({ configured: false })
    })

    it.each([
      ['Google without email', googleIdentity({ email: null })],
      ['Google with an unverified email', googleIdentity({ emailVerified: false })],
      ['Facebook without email', facebookIdentity({ email: null })],
    ])('refuses %s', async (_name, identity) => {
      const store = makeUserStore()
      const { deps } = makeCompleteDeps(store, identity)
      await expect(new CompleteSocialLoginUsecase(deps).execute(input({ provider: identity.provider }))).rejects.toThrow(
        EmailRequiredError,
      )
      expect(store.users.size).toBe(0)
    })
  })

  describe('Google', () => {
    it('creates a confirmed client without password and returns a 60 second code', async () => {
      const store = makeUserStore()
      const { deps } = makeCompleteDeps(store)
      const result = await new CompleteSocialLoginUsecase(deps).execute(input())

      expect(result).toEqual({ status: 'session', code: 'raw' })
      const [created] = store.users.values()
      expect(created).toMatchObject({
        email: 'ana@example.com',
        name: 'Ana',
        type: 'CLIENT',
        passwordHash: null,
        emailVerifiedAt: NOW,
        language: 'pt-BR',
      })
      expect(deps.createSocialLoginCode).toHaveBeenCalledWith({
        codeHash: 'hashed',
        userId: created?.id,
        expiresAt: new Date('2026-01-01T10:01:00Z'),
      })
    })

    it('uses the start of the email when the provider sends no name', async () => {
      const store = makeUserStore()
      await new CompleteSocialLoginUsecase(makeCompleteDeps(store, googleIdentity({ name: ' ' })).deps).execute(input())
      expect([...store.users.values()][0]?.name).toBe('ana')
    })

    it('enters a confirmed client with a password and links the identity', async () => {
      const store = makeUserStore([client({ email: 'ana@example.com' })])
      const { deps } = makeCompleteDeps(store)
      await new CompleteSocialLoginUsecase(deps).execute(input())
      expect(store.users.get('u1')?.socialIdentities).toEqual([{ provider: 'google', subject: 'g1', linkedAt: NOW }])
      expect(store.users.get('u1')?.passwordHash).toBe('hash')
      expect(deps.createSocialLoginCode).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1' }))
    })

    it('claims an unconfirmed client: confirms it, drops the password and the pending links', async () => {
      const store = makeUserStore([client({ email: 'ana@example.com', emailVerifiedAt: null })])
      const { deps } = makeCompleteDeps(store)
      await new CompleteSocialLoginUsecase(deps).execute(input())
      expect(store.users.get('u1')).toMatchObject({ emailVerifiedAt: NOW, passwordHash: null, tokenVersion: 1 })
      expect(store.invalidateEmailVerificationTokens).toHaveBeenCalledWith('u1', NOW)
      expect(store.invalidatePasswordResetTokens).toHaveBeenCalledWith('u1', NOW)
    })

    it('enters a client without a password', async () => {
      const store = makeUserStore([client({ email: 'ana@example.com', passwordHash: null })])
      const { deps } = makeCompleteDeps(store)
      await expect(new CompleteSocialLoginUsecase(deps).execute(input())).resolves.toMatchObject({ status: 'session' })
    })

    it('enters through the linked identity even after the email changed at the provider', async () => {
      const linked = client({ socialIdentities: [{ provider: 'google', subject: 'g1', linkedAt: NOW }] })
      const store = makeUserStore([linked])
      const { deps } = makeCompleteDeps(store, googleIdentity({ email: 'new@example.com' }))
      await new CompleteSocialLoginUsecase(deps).execute(input())
      expect(store.users.size).toBe(1)
      expect(deps.createSocialLoginCode).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1' }))
    })

    it('keeps the account linked to another Google profile and enters it', async () => {
      const other = client({ email: 'ana@example.com', socialIdentities: [{ provider: 'google', subject: 'g0', linkedAt: NOW }] })
      const store = makeUserStore([other])
      const { deps } = makeCompleteDeps(store)
      await new CompleteSocialLoginUsecase(deps).execute(input())
      expect(store.users.get('u1')?.socialIdentities.map((identity) => identity.subject)).toEqual(['g0'])
      expect(store.replaceSocialIdentity).not.toHaveBeenCalled()
    })

    it('refuses an administrator with the generic error, linking nothing', async () => {
      const store = makeUserStore([makeUser({ id: 'a1', type: 'ADMIN' })])
      const { deps } = makeCompleteDeps(store)
      await expect(new CompleteSocialLoginUsecase(deps).execute(input())).rejects.toThrow(InvalidCredentialsError)
      expect(store.linkSocialIdentity).not.toHaveBeenCalled()
      expect(deps.createSocialLoginCode).not.toHaveBeenCalled()
    })

    it('links to the account created by a simultaneous entry', async () => {
      const store = makeUserStore()
      const winner = client({ email: 'ana@example.com' })
      store.createSocialClientUser.mockImplementationOnce(async () => {
        store.users.set(winner.id, winner)
        return null
      })
      const { deps } = makeCompleteDeps(store)
      await new CompleteSocialLoginUsecase(deps).execute(input())
      expect(store.users.size).toBe(1)
      expect(store.users.get('u1')?.socialIdentities).toHaveLength(1)
    })

    it('enters a locked account, without touching the attempts', async () => {
      const store = makeUserStore([client({ email: 'ana@example.com', lockedUntil: new Date('2026-01-01T10:10:00Z') })])
      const { deps } = makeCompleteDeps(store)
      await expect(new CompleteSocialLoginUsecase(deps).execute(input())).resolves.toMatchObject({ status: 'session' })
    })

    it('warns about a new network like the password login', async () => {
      const store = makeUserStore([client({ email: 'ana@example.com', knownNetworks: ['net:198.51.100'] })])
      const { deps, flush } = makeCompleteDeps(store)
      await new CompleteSocialLoginUsecase(deps).execute(input())
      await flush()
      expect(deps.addKnownNetwork).toHaveBeenCalledWith('u1', 'net:203.0.113')
      expect(deps.sendNewLocationEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'ana@example.com', userType: 'CLIENT', userAgent: 'Firefox' }),
      )
    })
  })

  describe('Facebook', () => {
    const facebookInput = input({ provider: 'facebook' })

    it.each([
      ['without an account', []],
      ['with a confirmed client', [client({ email: 'ana@example.com' })]],
      ['with an unconfirmed client', [client({ email: 'ana@example.com', emailVerifiedAt: null })]],
      ['with a client without password', [client({ email: 'ana@example.com', passwordHash: null })]],
    ])('only asks for the email confirmation %s', async (_name, users) => {
      const store = makeUserStore(users)
      const before = [...store.users.values()]
      const { deps, flush } = makeCompleteDeps(store, facebookIdentity())
      const result = await new CompleteSocialLoginUsecase(deps).execute(facebookInput)
      await flush()

      expect(result).toEqual({ status: 'pending' })
      expect([...store.users.values()]).toEqual(before)
      expect(deps.createSocialLoginCode).not.toHaveBeenCalled()
      expect(deps.createSocialLinkRequest).toHaveBeenCalledWith({
        tokenHash: 'hashed',
        provider: 'facebook',
        subject: 'f1',
        email: 'ana@example.com',
        profileName: 'Ana FB',
        language: 'pt-BR',
        expiresAt: new Date('2026-01-02T10:00:00Z'),
        now: NOW,
      })
      expect(deps.sendSocialLinkEmail).toHaveBeenCalledWith({
        to: 'ana@example.com',
        language: 'pt-BR',
        token: 'raw',
        profileName: 'Ana FB',
      })
    })

    it('enters directly with an identity already linked', async () => {
      const linked = client({ socialIdentities: [{ provider: 'facebook', subject: 'f1', linkedAt: NOW }] })
      const { deps } = makeCompleteDeps(makeUserStore([linked]), facebookIdentity())
      await expect(new CompleteSocialLoginUsecase(deps).execute(facebookInput)).resolves.toEqual({
        status: 'session',
        code: 'raw',
      })
      expect(deps.createSocialLinkRequest).not.toHaveBeenCalled()
    })

    it('answers pending for an administrator email, without a request or an email', async () => {
      const store = makeUserStore([makeUser({ id: 'a1', type: 'ADMIN' })])
      const { deps, flush } = makeCompleteDeps(store, facebookIdentity())
      await expect(new CompleteSocialLoginUsecase(deps).execute(facebookInput)).resolves.toEqual({ status: 'pending' })
      await flush()
      expect(deps.createSocialLinkRequest).not.toHaveBeenCalled()
      expect(deps.sendSocialLinkEmail).not.toHaveBeenCalled()
    })

    it('keeps the link already sent when a second request comes within the minute', async () => {
      const { deps } = makeCompleteDeps(makeUserStore(), facebookIdentity())
      deps.countRecentSocialLinkRequests = vi.fn(async () => 1)
      await expect(new CompleteSocialLoginUsecase(deps).execute(facebookInput)).resolves.toEqual({ status: 'pending' })
      expect(deps.countRecentSocialLinkRequests).toHaveBeenCalledWith('ana@example.com', new Date('2026-01-01T09:59:00Z'))
      expect(deps.createSocialLinkRequest).not.toHaveBeenCalled()
    })

    it('sends nothing after 5 emails to the address in 24 hours', async () => {
      const { deps } = makeCompleteDeps(makeUserStore(), facebookIdentity())
      deps.countRecentSocialLinkRequests = vi.fn(async (_email: string, since: Date) =>
        since.getTime() === new Date('2026-01-01T09:59:00Z').getTime() ? 0 : 5,
      )
      await expect(new CompleteSocialLoginUsecase(deps).execute(facebookInput)).resolves.toEqual({ status: 'pending' })
      expect(deps.createSocialLinkRequest).not.toHaveBeenCalled()
    })

    it('sends nothing after 10 requests from the network in the hour', async () => {
      const { deps } = makeCompleteDeps(makeUserStore(), facebookIdentity())
      deps.incrementSocialLinkAttempts = vi.fn(async () => 11)
      await expect(new CompleteSocialLoginUsecase(deps).execute(facebookInput)).resolves.toEqual({ status: 'pending' })
      expect(deps.incrementSocialLinkAttempts).toHaveBeenCalledWith('net:203.0.113', NOW)
      expect(deps.createSocialLinkRequest).not.toHaveBeenCalled()
    })

    it('does not count a request without an address', async () => {
      const { deps } = makeCompleteDeps(makeUserStore(), facebookIdentity())
      await new CompleteSocialLoginUsecase(deps).execute({ ...facebookInput, ip: undefined })
      expect(deps.incrementSocialLinkAttempts).not.toHaveBeenCalled()
      expect(deps.createSocialLinkRequest).toHaveBeenCalled()
    })

    it('writes the email in the saved language of the account', async () => {
      const store = makeUserStore([client({ email: 'ana@example.com', language: 'en' })])
      const { deps, flush } = makeCompleteDeps(store, facebookIdentity())
      await new CompleteSocialLoginUsecase(deps).execute(facebookInput)
      await flush()
      expect(deps.sendSocialLinkEmail).toHaveBeenCalledWith(expect.objectContaining({ language: 'en' }))
    })
  })
})
