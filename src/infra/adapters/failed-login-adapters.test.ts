import { describe, expect, it } from 'vitest'
import { UserModel } from '../schemas/users-schema.js'
import { clearFailedLogins } from './clear-failed-logins-adapter.js'
import { recordFailedLogin } from './record-failed-login-adapter.js'
import { useTestDatabase } from './use-test-database.mock.js'

const NOW = new Date('2026-01-01T10:00:00Z')

const createUser = () =>
  UserModel.create({ name: 'Ana', email: 'ana@example.com', passwordHash: 'h', type: 'ADMIN' })

describe('failed login adapters', () => {
  useTestDatabase()

  it('locks for 15 minutes on the third failure', async () => {
    const { id } = await createUser()
    await expect(recordFailedLogin(id, NOW)).resolves.toEqual({ locked: false })
    await expect(recordFailedLogin(id, NOW)).resolves.toEqual({ locked: false })
    await expect(recordFailedLogin(id, NOW)).resolves.toEqual({ locked: true })

    const saved = await UserModel.findById(id).lean()
    expect(saved?.lockedUntil).toEqual(new Date('2026-01-01T10:15:00Z'))
    expect(saved?.failedLoginAttempts).toBe(0)
  })

  it('locks only once for simultaneous failures', async () => {
    const { id } = await createUser()
    const results = await Promise.all(Array.from({ length: 3 }, () => recordFailedLogin(id, NOW)))
    expect(results.filter((result) => result.locked)).toHaveLength(1)
  })

  it('clears the count and the lock', async () => {
    const { id } = await createUser()
    await UserModel.updateOne({ _id: id }, { failedLoginAttempts: 2, lockedUntil: NOW })
    await clearFailedLogins(id)
    await expect(UserModel.findById(id).lean()).resolves.toMatchObject({ failedLoginAttempts: 0, lockedUntil: null })
  })
})
