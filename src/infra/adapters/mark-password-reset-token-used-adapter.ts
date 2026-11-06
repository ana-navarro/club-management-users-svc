import type { MarkPasswordResetTokenUsedPort } from '../../domain/ports/auth-output-ports.js'
import { PasswordResetTokenModel } from '../schemas/password-reset-tokens-schema.js'

export const markPasswordResetTokenUsed: MarkPasswordResetTokenUsedPort = async (id, now) => {
  const result = await PasswordResetTokenModel.updateOne({ _id: id, usedAt: null }, { $set: { usedAt: now } })
  return result.modifiedCount === 1
}
