import type { InvalidatePasswordResetTokensPort } from '../../domain/ports/auth-output-ports.js'
import { PasswordResetTokenModel } from '../schemas/password-reset-tokens-schema.js'

export const invalidatePasswordResetTokens: InvalidatePasswordResetTokensPort = async (userId, now) => {
  await PasswordResetTokenModel.updateMany({ userId, usedAt: null }, { $set: { usedAt: now } })
}
