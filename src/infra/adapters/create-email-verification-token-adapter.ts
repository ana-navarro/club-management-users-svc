import type { CreateEmailVerificationTokenPort } from '../../domain/ports/registration-output-ports.js'
import { EmailVerificationTokenModel } from '../schemas/email-verification-tokens-schema.js'
import { UserModel } from '../schemas/users-schema.js'

// A new link replaces the previous ones, and the send time feeds the 1 minute resend limit.
export const createEmailVerificationToken: CreateEmailVerificationTokenPort = async ({
  userId,
  tokenHash,
  expiresAt,
  now,
}) => {
  await EmailVerificationTokenModel.updateMany({ userId, usedAt: null }, { $set: { usedAt: now } })
  await EmailVerificationTokenModel.create({ userId, tokenHash, expiresAt })
  await UserModel.updateOne({ _id: userId }, { $set: { verificationEmailSentAt: now } })
}
