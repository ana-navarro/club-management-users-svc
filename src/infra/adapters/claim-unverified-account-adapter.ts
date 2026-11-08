import type { ClaimUnverifiedAccountPort } from '../../domain/ports/social-login-output-ports.js'
import { UserModel } from '../schemas/users-schema.js'

// Research R7: whoever signed up with this email before knows the password, so the owner who proved the
// email takes the account without it, and every session of the old password ends.
export const claimUnverifiedAccount: ClaimUnverifiedAccountPort = async (userId, now) => {
  const result = await UserModel.updateOne(
    { _id: userId, emailVerifiedAt: null },
    { $set: { emailVerifiedAt: now, passwordHash: null }, $inc: { tokenVersion: 1 } },
  )
  return result.modifiedCount === 1
}
