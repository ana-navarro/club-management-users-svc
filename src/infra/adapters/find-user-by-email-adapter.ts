import type { FindUserByEmailPort } from '../../domain/ports/auth-output-ports.js'
import { UserModel } from '../schemas/users-schema.js'
import { mapUser } from './map-user-adapter.js'

export const findUserByEmail: FindUserByEmailPort = async (email) => {
  const document = await UserModel.findOne({ email: { $eq: email } }).lean()
  return document ? mapUser(document) : null
}
