import type { LinkSocialIdentityPort } from '../../domain/ports/social-login-output-ports.js'
import { UserModel } from '../schemas/users-schema.js'
import { isDuplicateKeyError } from './create-client-user-adapter.js'

// One identity per provider: it is added only while the user has none of that provider.
// Returns false when it was not added, including when another user already has that identity.
export const linkSocialIdentity: LinkSocialIdentityPort = async (userId, identity) => {
  try {
    const result = await UserModel.updateOne(
      { _id: userId, 'socialIdentities.provider': { $ne: identity.provider } },
      { $push: { socialIdentities: identity } },
    )
    return result.modifiedCount === 1
  } catch (error) {
    if (error instanceof Error && isDuplicateKeyError(error)) return false
    throw error
  }
}
