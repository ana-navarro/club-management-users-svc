import type { InvalidateEmailVerificationTokensPort } from '../../domain/ports/registration-output-ports.js'
import { EmailVerificationTokenModel } from '../schemas/email-verification-tokens-schema.js'

export const invalidateEmailVerificationTokens: InvalidateEmailVerificationTokensPort = async (userId, now) => {
  await EmailVerificationTokenModel.updateMany({ userId, usedAt: null }, { $set: { usedAt: now } })
}
