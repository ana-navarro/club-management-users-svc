import { describe, expect, it } from 'vitest'
import { ClubModel } from '../schemas/clubs-schema.js'
import { PasswordResetTokenModel } from '../schemas/password-reset-tokens-schema.js'
import { UserModel } from '../schemas/users-schema.js'
import { createPasswordResetToken } from './create-password-reset-token-adapter.js'
import { findPasswordResetToken } from './find-password-reset-token-adapter.js'
import { findUserByEmail } from './find-user-by-email-adapter.js'
import { findUserById } from './find-user-by-id-adapter.js'
import { invalidatePasswordResetTokens } from './invalidate-password-reset-tokens-adapter.js'
import { markPasswordResetTokenUsed } from './mark-password-reset-token-used-adapter.js'
import { updateUserPassword } from './update-user-password-adapter.js'
import { updateUserPreferences } from './update-user-preferences-adapter.js'
import { useTestDatabase } from './use-test-database.mock.js'

const NOW = new Date('2026-01-01T10:00:00Z')

const createUser = async () => {
  const club = await ClubModel.create({ name: 'Club' })
  return UserModel.create({
    name: 'Ana',
    email: 'ana@example.com',
    passwordHash: 'old',
    type: 'ADMIN',
    clubIds: [club._id],
  })
}

describe('database adapters', () => {
  useTestDatabase()

  it('finds a user by email, with clubs', async () => {
    await createUser()
    const user = await findUserByEmail('ana@example.com')
    expect(user?.clubs.map((club) => club.name)).toEqual(['Club'])
    expect(user?.theme).toBeNull()
    await expect(findUserByEmail('other@example.com')).resolves.toBeNull()
  })

  it('finds a user by id and tolerates invalid ids', async () => {
    const created = await createUser()
    await expect(findUserById(created.id)).resolves.toMatchObject({ email: 'ana@example.com' })
    await expect(findUserById('not-an-id')).resolves.toBeNull()
    await expect(findUserById('507f1f77bcf86cd799439011')).resolves.toBeNull()
  })

  it('keeps the email unique', async () => {
    await createUser()
    await expect(createUser()).rejects.toThrow()
  })

  it('saves only the given preferences', async () => {
    const created = await createUser()
    await updateUserPreferences(created.id, { theme: 'dark' })
    await updateUserPreferences(created.id, { language: 'en' })
    await expect(findUserById(created.id)).resolves.toMatchObject({ theme: 'dark', language: 'en' })
  })

  it('changes the password, invalidates tokens and clears the counters', async () => {
    const created = await createUser()
    await UserModel.updateOne(
      { _id: created._id },
      { failedLoginAttempts: 2, lockedUntil: NOW, passwordResetRequests: 5, passwordResetWindowStartedAt: NOW },
    )

    await updateUserPassword(created.id, 'new')

    const saved = await UserModel.findById(created._id).lean()
    expect(saved).toMatchObject({
      passwordHash: 'new',
      tokenVersion: 1,
      failedLoginAttempts: 0,
      lockedUntil: null,
      passwordResetRequests: 0,
      passwordResetWindowStartedAt: null,
    })
  })

  it('stores, finds and spends a reset token only once', async () => {
    const created = await createUser()
    await createPasswordResetToken({ userId: created.id, tokenHash: 'h1', expiresAt: NOW })

    const found = await findPasswordResetToken('h1')
    if (!found) throw new Error('Expected the token')
    expect(found).toMatchObject({ userId: created.id, usedAt: null })
    await expect(findPasswordResetToken('other')).resolves.toBeNull()

    await expect(markPasswordResetTokenUsed(found.id, NOW)).resolves.toBe(true)
    await expect(markPasswordResetTokenUsed(found.id, NOW)).resolves.toBe(false)
  })

  it('invalidates the open tokens of a user', async () => {
    const created = await createUser()
    await createPasswordResetToken({ userId: created.id, tokenHash: 'h1', expiresAt: NOW })
    await createPasswordResetToken({ userId: created.id, tokenHash: 'h2', expiresAt: NOW })

    await invalidatePasswordResetTokens(created.id, NOW)

    await expect(PasswordResetTokenModel.countDocuments({ usedAt: null })).resolves.toBe(0)
  })
})
