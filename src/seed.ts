import mongoose from 'mongoose'
import { connectDatabase } from './config/create-database-config.js'
import { runSeed } from './config/run-seed-config.js'

const { DATABASE_URL, DATABASE_NAME } = process.env
if (!DATABASE_URL || !DATABASE_NAME) throw new Error('Missing environment variables: DATABASE_URL, DATABASE_NAME')

await connectDatabase(DATABASE_URL, DATABASE_NAME)
console.log(`Seed: ${await runSeed(process.env)}`)
await mongoose.disconnect()
