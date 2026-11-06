import type { UpdateUserPasswordPort } from '../../domain/ports/auth-output-ports.js'
import { UserModel } from '../schemas/users-schema.js'

export const updateUserPassword: UpdateUserPasswordPort = async (id, passwordHash) => {
  await UserModel.updateOne(
    { _id: id },
    {
      $set: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        passwordResetRequests: 0,
        passwordResetWindowStartedAt: null,
      },
      $inc: { tokenVersion: 1 },
    },
  )
}
