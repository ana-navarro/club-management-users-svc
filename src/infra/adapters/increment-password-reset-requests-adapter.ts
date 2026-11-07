import type { IncrementPasswordResetRequestsPort } from '../../domain/ports/auth-output-ports.js'
import { UserModel } from '../schemas/users-schema.js'

const WINDOW_MS = 24 * 60 * 60 * 1000

export const incrementPasswordResetRequests: IncrementPasswordResetRequestsPort = async (id, now) => {
  const restarted = await UserModel.findOneAndUpdate(
    {
      _id: id,
      $or: [
        { passwordResetWindowStartedAt: null },
        { passwordResetWindowStartedAt: { $lte: new Date(now.getTime() - WINDOW_MS) } },
      ],
    },
    { $set: { passwordResetRequests: 1, passwordResetWindowStartedAt: now } },
    { returnDocument: 'after' },
  ).lean()
  if (restarted) return restarted.passwordResetRequests

  const counted = await UserModel.findOneAndUpdate(
    { _id: id },
    { $inc: { passwordResetRequests: 1 } },
    { returnDocument: 'after' },
  ).lean()
  return counted?.passwordResetRequests ?? 0
}
