import { describe, expect, it, vi } from 'vitest'
import type { SocialIdentity, SocialProvider } from '../../domain/models/social-identity-model.js'
import type { Language } from '../../domain/models/user-model.js'
import type { EmailTransport } from './create-email-link-adapter.js'
import { PasswordResetTokenModel } from '../schemas/password-reset-tokens-schema.js'
import { SocialLinkAttemptModel } from '../schemas/social-link-attempts-schema.js'
import { UserModel } from '../schemas/users-schema.js'
import { claimUnverifiedAccount } from './claim-unverified-account-adapter.js'
import { consumeOAuthState } from './consume-oauth-state-adapter.js'
import { consumeSocialLinkRequest } from './consume-social-link-request-adapter.js'
import { consumeSocialLoginCode } from './consume-social-login-code-adapter.js'
import { countRecentSocialLinkRequests } from './count-recent-social-link-requests-adapter.js'
import { createClientUser } from './create-client-user-adapter.js'
import { createOAuthState } from './create-oauth-state-adapter.js'
import { createSocialClientUser } from './create-social-client-user-adapter.js'
import { createSocialLinkRequest } from './create-social-link-request-adapter.js'
import { createSocialLoginCode } from './create-social-login-code-adapter.js'
import { findSocialLinkRequest } from './find-social-link-request-adapter.js'
import { findUserByEmail } from './find-user-by-email-adapter.js'
import { findUserBySocialIdentity } from './find-user-by-social-identity-adapter.js'
import { incrementSocialLinkAttempts } from './increment-social-link-attempts-adapter.js'
import { invalidatePasswordResetTokens } from './invalidate-password-reset-tokens-adapter.js'
import { linkSocialIdentity } from './link-social-identity-adapter.js'
import { replaceSocialIdentity } from './replace-social-identity-adapter.js'
import { createSendSocialLinkEmail } from './send-social-link-email-adapter.js'
import { useTestDatabase } from './use-test-database.mock.js'

const NOW = new Date('2026-01-01T10:00:00Z')
const LATER = new Date('2026-01-01T10:05:00Z')
const google = (subject = 'g1'): SocialIdentity => ({ provider: 'google', subject, linkedAt: NOW })
const facebook = (subject = 'f1'): SocialIdentity => ({ provider: 'facebook', subject, linkedAt: NOW })

const newClient = async (email = 'ana@example.com') => {
  const user = await createClientUser({ name: 'Ana', email, passwordHash: 'hash', language: null })
  if (!user) throw new Error('Expected a user')
  return user
}

const linkRequest = (tokenHash: string, overrides: { subject?: string; email?: string; now?: Date } = {}) =>
  createSocialLinkRequest({
    tokenHash,
    provider: 'facebook',
    subject: overrides.subject ?? 'f1',
    email: overrides.email ?? 'ana@example.com',
    profileName: 'Ana FB',
    language: 'en',
    expiresAt: new Date(NOW.getTime() + 24 * 60 * 60 * 1000),
    now: overrides.now ?? NOW,
  })

describe('social login adapters', () => {
  useTestDatabase()

  describe('oauth states', () => {
    const provider: SocialProvider = 'google'
    const language: Language = 'pt-BR'
    const state = { stateHash: 'state', bindingHash: 'binding', provider, codeVerifier: 'verifier', nonce: 'nonce', language, expiresAt: LATER }

    it('gives the attempt back once, only with the same binding and provider', async () => {
      await createOAuthState(state)
      const wrongBinding = { stateHash: 'state', bindingHash: 'other', provider, now: NOW }
      await expect(consumeOAuthState(wrongBinding)).resolves.toBeNull()
      await expect(consumeOAuthState({ ...wrongBinding, bindingHash: 'binding', provider: 'facebook' })).resolves.toBeNull()

      const right = { ...wrongBinding, bindingHash: 'binding' }
      await expect(consumeOAuthState(right)).resolves.toEqual({ codeVerifier: 'verifier', nonce: 'nonce', language: 'pt-BR' })
      await expect(consumeOAuthState(right)).resolves.toBeNull()
    })

    it('refuses an expired attempt', async () => {
      await createOAuthState(state)
      await expect(
        consumeOAuthState({ stateHash: 'state', bindingHash: 'binding', provider: 'google', now: LATER }),
      ).resolves.toBeNull()
    })
  })

  describe('identities', () => {
    it('finds a user by identity and links one identity per provider', async () => {
      const user = await newClient()
      await expect(linkSocialIdentity(user.id, google())).resolves.toBe(true)
      await expect(linkSocialIdentity(user.id, google('g2'))).resolves.toBe(false)
      await expect(linkSocialIdentity(user.id, facebook())).resolves.toBe(true)

      await expect(findUserBySocialIdentity('google', 'g1')).resolves.toMatchObject({ id: user.id })
      await expect(findUserBySocialIdentity('google', 'g2')).resolves.toBeNull()
      await expect(findUserBySocialIdentity('facebook', 'g1')).resolves.toBeNull()
    })

    it('refuses an identity already linked to another user', async () => {
      const first = await newClient('first@example.com')
      const second = await newClient('second@example.com')
      await linkSocialIdentity(first.id, google())
      await expect(linkSocialIdentity(second.id, google())).resolves.toBe(false)
      await expect(replaceSocialIdentity(second.id, google())).resolves.toBe(false)
    })

    it('replaces the identity of a provider, keeping the others', async () => {
      const user = await newClient()
      await linkSocialIdentity(user.id, facebook('old'))
      await linkSocialIdentity(user.id, google())
      await expect(replaceSocialIdentity(user.id, facebook('new'))).resolves.toBe(true)

      const updated = await findUserByEmail('ana@example.com')
      expect(updated?.socialIdentities.map((identity) => `${identity.provider}:${identity.subject}`).sort()).toEqual([
        'facebook:new',
        'google:g1',
      ])
      await expect(findUserBySocialIdentity('facebook', 'old')).resolves.toBeNull()
    })

    it('creates a confirmed client without password, and one account for simultaneous first logins', async () => {
      const input = { name: 'Ana', email: 'ana@example.com', identity: google(), language: null, now: NOW }
      const results = await Promise.all([createSocialClientUser(input), createSocialClientUser(input)])
      const created = results.filter((user) => user !== null)
      expect(created).toHaveLength(1)
      expect(created[0]).toMatchObject({ type: 'CLIENT', passwordHash: null, emailVerifiedAt: NOW })
      await expect(UserModel.countDocuments()).resolves.toBe(1)
    })

    it('rethrows errors other than a duplicate', async () => {
      await expect(
        createSocialClientUser({ name: '', email: 'x@example.com', identity: google(), language: null, now: NOW }),
      ).rejects.toThrow()
    })
  })

  describe('claim of an unconfirmed account', () => {
    it('confirms, drops the password and ends the sessions, only once', async () => {
      const user = await newClient()
      await expect(claimUnverifiedAccount(user.id, NOW)).resolves.toBe(true)
      await expect(claimUnverifiedAccount(user.id, LATER)).resolves.toBe(false)

      const claimed = await UserModel.findById(user.id).lean()
      expect(claimed).toMatchObject({ emailVerifiedAt: NOW, passwordHash: null, tokenVersion: 1 })
    })

    it('leaves the reset links to the usecase, which invalidates them', async () => {
      const user = await newClient()
      await PasswordResetTokenModel.create({ userId: user.id, tokenHash: 'reset', expiresAt: LATER })
      await invalidatePasswordResetTokens(user.id, NOW)
      await expect(PasswordResetTokenModel.countDocuments({ usedAt: null })).resolves.toBe(0)
    })
  })

  describe('session codes', () => {
    it('trades a code once, before it expires', async () => {
      const user = await newClient()
      await createSocialLoginCode({ codeHash: 'code', userId: user.id, expiresAt: LATER })
      const results = await Promise.all([consumeSocialLoginCode('code', NOW), consumeSocialLoginCode('code', NOW)])
      expect(results.filter((result) => result === user.id)).toHaveLength(1)

      await createSocialLoginCode({ codeHash: 'late', userId: user.id, expiresAt: NOW })
      await expect(consumeSocialLoginCode('late', NOW)).resolves.toBeNull()
    })
  })

  describe('Facebook link requests', () => {
    it('keeps only the newest link of an identity', async () => {
      await linkRequest('first')
      await linkRequest('second', { now: LATER })
      await expect(findSocialLinkRequest('first', LATER)).resolves.toBeNull()
      await expect(findSocialLinkRequest('second', LATER)).resolves.toMatchObject({
        provider: 'facebook',
        subject: 'f1',
        email: 'ana@example.com',
        profileName: 'Ana FB',
        language: 'en',
      })
    })

    it('keeps the links of other identities', async () => {
      await linkRequest('first')
      await linkRequest('second', { subject: 'f2' })
      await expect(findSocialLinkRequest('first', NOW)).resolves.not.toBeNull()
    })

    it('counts the recent requests of an email', async () => {
      await linkRequest('a', { now: NOW })
      await linkRequest('b', { subject: 'f2', now: LATER })
      await linkRequest('c', { email: 'other@example.com' })
      await expect(countRecentSocialLinkRequests('ana@example.com', new Date(NOW.getTime() - 1))).resolves.toBe(2)
      await expect(countRecentSocialLinkRequests('ana@example.com', NOW)).resolves.toBe(1)
    })

    it('gives a request to only one of simultaneous confirmations, and not after it expires', async () => {
      await linkRequest('token')
      const results = await Promise.all([consumeSocialLinkRequest('token', NOW), consumeSocialLinkRequest('token', NOW)])
      expect(results.filter((result) => result !== null)).toHaveLength(1)
      await expect(findSocialLinkRequest('token', NOW)).resolves.toBeNull()

      await linkRequest('old', { subject: 'f9' })
      await expect(consumeSocialLinkRequest('old', new Date(NOW.getTime() + 25 * 60 * 60 * 1000))).resolves.toBeNull()
    })

    it('counts link requests per network', async () => {
      await expect(incrementSocialLinkAttempts('net', NOW)).resolves.toBe(1)
      await expect(incrementSocialLinkAttempts('net', NOW)).resolves.toBe(2)
      await expect(SocialLinkAttemptModel.countDocuments()).resolves.toBe(1)
    })
  })
})

describe('createSendSocialLinkEmail', () => {
  const makeTransport = () => ({ sendMail: vi.fn<EmailTransport['sendMail']>(async () => ({})) })

  it('names the Facebook profile and links to the confirmation page, in Portuguese', async () => {
    const transport = makeTransport()
    await createSendSocialLinkEmail(transport, 'f@e.com', 'https://client.test/')({
      to: 'ana@example.com',
      language: 'pt-BR',
      token: 'a+b',
      profileName: 'Ana\nFB',
    })
    const message = transport.sendMail.mock.lastCall?.[0]
    expect(message?.subject).toBe('Confirme a entrada com o Facebook')
    expect(message?.text).toContain('"Ana FB"')
    expect(message?.text).toContain('https://client.test/confirm-social-link?token=a%2Bb')
    expect(message?.text).toContain('Não fui eu')
  })

  it('writes in English, with a fallback name', async () => {
    const transport = makeTransport()
    await createSendSocialLinkEmail(transport, 'f@e.com', 'https://client.test')({
      to: 'ana@example.com',
      language: 'en',
      token: 't',
      profileName: '   ',
    })
    const message = transport.sendMail.mock.lastCall?.[0]
    expect(message?.subject).toBe('Confirm the sign-in with Facebook')
    expect(message?.text).toContain('"Facebook"')
    expect(message?.text).toContain('This was not me')
  })
})
