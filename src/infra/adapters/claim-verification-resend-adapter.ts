import { VERIFICATION_RESEND_SECONDS } from '../../domain/models/user-model.js'
import type { ClaimVerificationResendPort } from '../../domain/ports/registration-output-ports.js'
import { UserModel } from '../schemas/users-schema.js'

// Atomic, so simultaneous resends inside the limit send a single email.
export const claimVerificationResend: ClaimVerificationResendPort = async (userId, now) => {
  const limit = new Date(now.getTime() - VERIFICATION_RESEND_SECONDS * 1000)
  const result = await UserModel.updateOne(
    {
      _id: userId,
      $or: [{ verificationEmailSentAt: null }, { verificationEmailSentAt: { $lte: limit } }],
    },
    { $set: { verificationEmailSentAt: now } },
  )
  return result.modifiedCount === 1
}
