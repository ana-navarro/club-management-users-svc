import type { UpdateUserPreferencesPort } from '../../domain/ports/auth-output-ports.js'
import { UserModel } from '../schemas/users-schema.js'

export const updateUserPreferences: UpdateUserPreferencesPort = async (id, preferences) => {
  await UserModel.updateOne({ _id: id }, { $set: preferences })
}
