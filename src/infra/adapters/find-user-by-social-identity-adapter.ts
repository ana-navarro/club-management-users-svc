import type { FindUserBySocialIdentityPort } from '../../domain/ports/social-login-output-ports.js'
import { UserModel } from '../schemas/users-schema.js'
import { mapUser } from './map-user-adapter.js'

export const findUserBySocialIdentity: FindUserBySocialIdentityPort = async (provider, subject) => {
  const document = await UserModel.findOne({
    socialIdentities: { $elemMatch: { provider: { $eq: provider }, subject: { $eq: subject } } },
  }).lean()
  return document ? mapUser(document) : null
}
