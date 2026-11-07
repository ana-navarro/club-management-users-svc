import type { FindPasswordResetTokenPort } from '../../domain/ports/auth-output-ports.js'
import { PasswordResetTokenModel } from '../schemas/password-reset-tokens-schema.js'

export const findPasswordResetToken: FindPasswordResetTokenPort = async (tokenHash) => {
  const document = await PasswordResetTokenModel.findOne({ tokenHash: { $eq: tokenHash } }).lean()
  if (!document) return null
  return {
    id: document._id.toString(),
    userId: document.userId.toString(),
    expiresAt: document.expiresAt,
    usedAt: document.usedAt ?? null,
  }
}
