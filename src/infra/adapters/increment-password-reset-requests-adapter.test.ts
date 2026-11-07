import { describe, expect, it } from 'vitest'
import { UserModel } from '../schemas/users-schema.js'
import { incrementPasswordResetRequests } from './increment-password-reset-requests-adapter.js'
import { useTestDatabase } from './use-test-database.mock.js'

const NOW = new Date('2026-01-01T10:00:00Z')

describe('incrementPasswordResetRequests', () => {
  useTestDatabase()

  const createUser = () =>
    UserModel.create({ name: 'Ana', email: 'ana@example.com', passwordHash: 'h', type: 'ADMIN' })

  it('counts simultaneous requests without losing any', async () => {
    const { id } = await createUser()
    await incrementPasswordResetRequests(id, NOW)
    await Promise.all(Array.from({ length: 4 }, () => incrementPasswordResetRequests(id, NOW)))
    await expect(UserModel.findById(id).lean()).resolves.toMatchObject({ passwordResetRequests: 5 })
  })

  it('restarts 24 hours after the first request', async () => {
    const { id } = await createUser()
    await incrementPasswordResetRequests(id, NOW)
    await incrementPasswordResetRequests(id, NOW)

    const almost = new Date('2026-01-02T09:59:59Z')
    await expect(incrementPasswordResetRequests(id, almost)).resolves.toBe(3)

    const after = new Date('2026-01-02T10:00:00Z')
    await expect(incrementPasswordResetRequests(id, after)).resolves.toBe(1)
  })

  it('returns zero for a user that no longer exists', async () => {
    await expect(incrementPasswordResetRequests('507f1f77bcf86cd799439011', NOW)).resolves.toBe(0)
  })
})
