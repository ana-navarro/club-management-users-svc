import mongoose from 'mongoose'
import type { CreateClientUserPort } from '../../domain/ports/registration-output-ports.js'
import { UserModel } from '../schemas/users-schema.js'
import { mapUser } from './map-user-adapter.js'

const DUPLICATE_KEY = 11000

export function isDuplicateKeyError(error: Error): boolean {
  return error instanceof mongoose.mongo.MongoServerError && error.code === DUPLICATE_KEY
}

// Always a client, with the email still to confirm. The unique index decides simultaneous sign-ups.
export const createClientUser: CreateClientUserPort = async ({ name, email, passwordHash, language }) => {
  try {
    const document = await UserModel.create({
      name,
      email,
      passwordHash,
      type: 'CLIENT',
      language,
      emailVerifiedAt: null,
    })
    return mapUser(document.toObject())
  } catch (error) {
    if (error instanceof Error && isDuplicateKeyError(error)) return null
    throw error
  }
}
