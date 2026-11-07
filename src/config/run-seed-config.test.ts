import { describe, expect, it } from 'vitest'
import { useTestDatabase } from '../infra/adapters/use-test-database.mock.js'
import { verifyPassword } from '../infra/adapters/verify-password-adapter.js'
import { UserModel } from '../infra/schemas/users-schema.js'
import { runSeed } from './run-seed-config.js'

const env = { SEED_ADMIN_EMAIL: 'Admin@Example.com', SEED_ADMIN_PASSWORD: 'seed-password' }

describe('runSeed', () => {
  useTestDatabase()

  it('creates the administrator with a hashed password', async () => {
    await expect(runSeed(env)).resolves.toBe('created')
    const admin = await UserModel.findOne({ email: 'admin@example.com' }).lean()
    expect(admin?.type).toBe('ADMIN')
    await expect(verifyPassword(admin?.passwordHash ?? '', 'seed-password')).resolves.toBe(true)
  })

  it('changes nothing when run twice', async () => {
    await runSeed(env)
    await expect(runSeed({ ...env, SEED_ADMIN_PASSWORD: 'another' })).resolves.toBe('exists')
    await expect(UserModel.countDocuments()).resolves.toBe(1)
    const admin = await UserModel.findOne({}).lean()
    await expect(verifyPassword(admin?.passwordHash ?? '', 'seed-password')).resolves.toBe(true)
  })

  it('does nothing without the variables', async () => {
    await expect(runSeed({})).resolves.toBe('skipped')
    await expect(runSeed({ SEED_ADMIN_EMAIL: 'a@b.c' })).resolves.toBe('skipped')
    await expect(UserModel.countDocuments()).resolves.toBe(0)
  })
})
