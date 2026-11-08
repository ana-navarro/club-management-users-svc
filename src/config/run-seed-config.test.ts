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
    expect(admin?.emailVerifiedAt).toBeInstanceOf(Date)
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

  it('creates a confirmed client with SEED_USER_TYPE=CLIENT', async () => {
    await expect(runSeed({ ...env, SEED_USER_TYPE: 'CLIENT' })).resolves.toBe('created')
    const client = await UserModel.findOne({ email: 'admin@example.com' }).lean()
    expect(client?.type).toBe('CLIENT')
    expect(client?.emailVerifiedAt).toBeInstanceOf(Date)
  })

  it('refuses an unknown SEED_USER_TYPE', async () => {
    await expect(runSeed({ ...env, SEED_USER_TYPE: 'OWNER' })).rejects.toThrow('Invalid user type')
  })

  it('marks existing administrators as confirmed since their creation, and leaves clients alone', async () => {
    const createdAt = new Date('2025-06-01T00:00:00Z')
    await UserModel.collection.insertMany([
      { name: 'Old', email: 'old@example.com', passwordHash: 'h', type: 'ADMIN', createdAt },
      { name: 'Client', email: 'client@example.com', passwordHash: 'h', type: 'CLIENT', createdAt, emailVerifiedAt: null },
    ])
    await runSeed({})
    const old = await UserModel.findOne({ email: 'old@example.com' }).lean()
    const client = await UserModel.findOne({ email: 'client@example.com' }).lean()
    expect(old?.emailVerifiedAt).toEqual(createdAt)
    expect(client?.emailVerifiedAt).toBeNull()
  })

  it('accepts many users without social identities and refuses a repeated identity', async () => {
    await runSeed({})
    await UserModel.create({ name: 'A', email: 'a@example.com', type: 'CLIENT' })
    await UserModel.create({ name: 'B', email: 'b@example.com', type: 'CLIENT' })
    const identity = { provider: 'google', subject: 's1', linkedAt: new Date() }
    await UserModel.create({ name: 'C', email: 'c@example.com', type: 'CLIENT', socialIdentities: [identity] })
    await expect(
      UserModel.create({ name: 'D', email: 'd@example.com', type: 'CLIENT', socialIdentities: [identity] }),
    ).rejects.toThrow(/duplicate key/)
  })
})
