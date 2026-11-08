import type { MarkEmailVerifiedPort } from '../../domain/ports/registration-output-ports.js'
import { UserModel } from '../schemas/users-schema.js'

// Keeps the first confirmation date.
export const markEmailVerified: MarkEmailVerifiedPort = async (userId, now) => {
  await UserModel.updateOne({ _id: userId, emailVerifiedAt: null }, { $set: { emailVerifiedAt: now } })
}
