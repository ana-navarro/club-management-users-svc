import { describe, expect, it } from 'vitest'
import { UserModel } from '../schemas/users-schema.js'
import { addKnownNetwork } from './add-known-network-adapter.js'
import { createHashNetwork } from './hash-network-adapter.js'
import { useTestDatabase } from './use-test-database.mock.js'

describe('known networks', () => {
  useTestDatabase()

  const createUser = () =>
    UserModel.create({ name: 'Ana', email: 'ana@example.com', passwordHash: 'h', type: 'ADMIN' })

  it('does not repeat a network', async () => {
    const { id } = await createUser()
    await addKnownNetwork(id, 'a')
    await addKnownNetwork(id, 'a')
    await expect(UserModel.findById(id).lean()).resolves.toMatchObject({ knownNetworks: ['a'] })
  })

  it('keeps only the latest 20', async () => {
    const { id } = await createUser()
    for (let i = 0; i < 22; i += 1) await addKnownNetwork(id, `n${i}`)
    const saved = await UserModel.findById(id).lean()
    expect(saved?.knownNetworks).toHaveLength(20)
    expect(saved?.knownNetworks[0]).toBe('n2')
    expect(saved?.knownNetworks.at(-1)).toBe('n21')
  })

  it('hashes prefixes with a key, so the address is never saved', () => {
    const hash = createHashNetwork('secret')
    expect(hash('203.0.113')).not.toContain('203.0.113')
    expect(hash('203.0.113')).toBe(hash('203.0.113'))
    expect(hash('203.0.113')).not.toBe(createHashNetwork('other')('203.0.113'))
  })
})
