import { describe, expect, it } from 'vitest'
import { EmailVerificationTokenModel } from '../schemas/email-verification-tokens-schema.js'
import { RegistrationAttemptModel } from '../schemas/registration-attempts-schema.js'
import { UserModel } from '../schemas/users-schema.js'
import { claimVerificationResend } from './claim-verification-resend-adapter.js'
import { consumeEmailVerificationToken } from './consume-email-verification-token-adapter.js'
import { createClientUser } from './create-client-user-adapter.js'
import { createEmailVerificationToken } from './create-email-verification-token-adapter.js'
import { incrementRegistrationAttempts } from './increment-registration-attempts-adapter.js'
import { invalidateEmailVerificationTokens } from './invalidate-email-verification-tokens-adapter.js'
import { markEmailVerified } from './mark-email-verified-adapter.js'
import { useTestDatabase } from './use-test-database.mock.js'

const NOW = new Date('2026-01-01T10:00:00Z')
const LATER = new Date('2026-01-02T10:00:00Z')
const newClient = { name: 'Ana', email: 'ana@example.com', passwordHash: 'hash', language: null }

describe('registration adapters', () => {
  useTestDatabase()

  it('creates a client still to confirm', async () => {
    const user = await createClientUser({ ...newClient, language: 'pt-BR' })
    expect(user).toMatchObject({ type: 'CLIENT', emailVerifiedAt: null, language: 'pt-BR', passwordHash: 'hash' })
  })

  it('creates a single account for two simultaneous sign-ups with the same email', async () => {
    const results = await Promise.all([createClientUser(newClient), createClientUser(newClient)])
    expect(results.filter((user) => user !== null)).toHaveLength(1)
    await expect(UserModel.countDocuments({ email: 'ana@example.com' })).resolves.toBe(1)
  })

  it('rethrows errors other than a duplicate', async () => {
    await expect(createClientUser({ ...newClient, name: '' })).rejects.toThrow()
  })

  it('replaces the pending link and records when it was sent', async () => {
    const user = await createClientUser(newClient)
    const userId = user?.id ?? ''
    await createEmailVerificationToken({ userId, tokenHash: 'first', expiresAt: LATER, now: NOW })
    await createEmailVerificationToken({ userId, tokenHash: 'second', expiresAt: LATER, now: NOW })

    await expect(consumeEmailVerificationToken('first', NOW)).resolves.toBeNull()
    await expect(UserModel.findById(userId).lean()).resolves.toMatchObject({ verificationEmailSentAt: NOW })
    await expect(consumeEmailVerificationToken('second', NOW)).resolves.toBe(userId)
  })

  it('uses a link only once, even with simultaneous uses', async () => {
    const user = await createClientUser(newClient)
    const userId = user?.id ?? ''
    await createEmailVerificationToken({ userId, tokenHash: 'hash', expiresAt: LATER, now: NOW })
    const results = await Promise.all([
      consumeEmailVerificationToken('hash', NOW),
      consumeEmailVerificationToken('hash', NOW),
    ])
    expect(results.filter((result) => result === userId)).toHaveLength(1)
  })

  it('refuses an expired or unknown link', async () => {
    const user = await createClientUser(newClient)
    await createEmailVerificationToken({ userId: user?.id ?? '', tokenHash: 'hash', expiresAt: NOW, now: NOW })
    await expect(consumeEmailVerificationToken('hash', NOW)).resolves.toBeNull()
    await expect(consumeEmailVerificationToken('other', NOW)).resolves.toBeNull()
  })

  it('invalidates the pending links', async () => {
    const user = await createClientUser(newClient)
    const userId = user?.id ?? ''
    await createEmailVerificationToken({ userId, tokenHash: 'hash', expiresAt: LATER, now: NOW })
    await invalidateEmailVerificationTokens(userId, NOW)
    await expect(consumeEmailVerificationToken('hash', NOW)).resolves.toBeNull()
    await expect(EmailVerificationTokenModel.countDocuments({ usedAt: null })).resolves.toBe(0)
  })

  it('marks the email confirmed once, keeping the first date', async () => {
    const user = await createClientUser(newClient)
    const userId = user?.id ?? ''
    await markEmailVerified(userId, NOW)
    await markEmailVerified(userId, LATER)
    await expect(UserModel.findById(userId).lean()).resolves.toMatchObject({ emailVerifiedAt: NOW })
  })

  it('allows one resend per minute', async () => {
    const user = await createClientUser(newClient)
    const userId = user?.id ?? ''
    const results = await Promise.all([claimVerificationResend(userId, NOW), claimVerificationResend(userId, NOW)])
    expect(results.filter(Boolean)).toHaveLength(1)
    await expect(claimVerificationResend(userId, new Date(NOW.getTime() + 59000))).resolves.toBe(false)
    await expect(claimVerificationResend(userId, new Date(NOW.getTime() + 60000))).resolves.toBe(true)
  })

  it('counts sign-ups per network and starts a new window after an hour', async () => {
    await expect(incrementRegistrationAttempts('net', NOW)).resolves.toBe(1)
    await expect(incrementRegistrationAttempts('net', NOW)).resolves.toBe(2)
    await expect(incrementRegistrationAttempts('other', NOW)).resolves.toBe(1)
    // The TTL has not deleted the document yet, but the window is over.
    await expect(incrementRegistrationAttempts('net', new Date(NOW.getTime() + 60 * 60 * 1000))).resolves.toBe(1)
  })

  it('counts simultaneous first attempts of a network together', async () => {
    const counts = await Promise.all([1, 2, 3, 4].map(() => incrementRegistrationAttempts('net', NOW)))
    expect([...counts].sort()).toEqual([1, 2, 3, 4])
    await expect(RegistrationAttemptModel.countDocuments()).resolves.toBe(1)
  })
})
