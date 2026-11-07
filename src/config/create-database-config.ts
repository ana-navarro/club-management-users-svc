import mongoose from 'mongoose'

export async function connectDatabase(url: string, name: string): Promise<void> {
  await mongoose.connect(url, { dbName: name, serverSelectionTimeoutMS: 30000 })
}
