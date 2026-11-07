import type { ClearFailedLoginsPort } from '../../domain/ports/auth-output-ports.js'
import { UserModel } from '../schemas/users-schema.js'

export const clearFailedLogins: ClearFailedLoginsPort = async (id) => {
  await UserModel.updateOne({ _id: id }, { $set: { failedLoginAttempts: 0, lockedUntil: null } })
}
