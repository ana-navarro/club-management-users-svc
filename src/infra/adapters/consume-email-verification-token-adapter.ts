import type { ConsumeEmailVerificationTokenPort } from '../../domain/ports/registration-output-ports.js'
import { EmailVerificationTokenModel } from '../schemas/email-verification-tokens-schema.js'

// One atomic update, so two simultaneous uses of the same link cannot both succeed.
export const consumeEmailVerificationToken: ConsumeEmailVerificationTokenPort = async (tokenHash, now) => {
  const document = await EmailVerificationTokenModel.findOneAndUpdate(
    { tokenHash: { $eq: tokenHash }, usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
  ).lean()
  return document ? document.userId.toString() : null
}
