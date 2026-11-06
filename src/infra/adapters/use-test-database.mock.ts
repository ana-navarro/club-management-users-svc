import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { afterAll, beforeAll, beforeEach } from 'vitest'

export function useTestDatabase(): void {
  let server: MongoMemoryServer

  beforeAll(async () => {
    server = await MongoMemoryServer.create()
    await mongoose.connect(server.getUri(), { dbName: 'test' })
  })

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase()
    await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()))
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await server.stop()
  })
}
