import { LOGIN_LOCK_MINUTES, MAXIMUM_LOGIN_ATTEMPTS } from '../../domain/models/user-model.js'
import type { RecordFailedLoginPort } from '../../domain/ports/auth-output-ports.js'
import { UserModel } from '../schemas/users-schema.js'

export const recordFailedLogin: RecordFailedLoginPort = async (id, now) => {
  const user = await UserModel.findOneAndUpdate(
    { _id: id },
    { $inc: { failedLoginAttempts: 1 } },
    { returnDocument: 'after' },
  ).lean()

  // Only the call that reaches the limit locks, so simultaneous failures send a single email.
  if (user?.failedLoginAttempts !== MAXIMUM_LOGIN_ATTEMPTS) return { locked: false }

  await UserModel.updateOne(
    { _id: id },
    { $set: { failedLoginAttempts: 0, lockedUntil: new Date(now.getTime() + LOGIN_LOCK_MINUTES * 60 * 1000) } },
  )
  return { locked: true }
}
