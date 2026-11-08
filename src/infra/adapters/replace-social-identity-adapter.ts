import type { ReplaceSocialIdentityPort } from '../../domain/ports/social-login-output-ports.js'
import { UserModel } from '../schemas/users-schema.js'
import { isDuplicateKeyError } from './create-client-user-adapter.js'

// In one update, drops the identity of that provider and adds the new one (research R5a).
export const replaceSocialIdentity: ReplaceSocialIdentityPort = async (userId, identity) => {
  try {
    const result = await UserModel.updateOne({ _id: userId }, [
      {
        $set: {
          socialIdentities: {
            $concatArrays: [
              {
                $filter: {
                  input: { $ifNull: ['$socialIdentities', []] },
                  cond: { $ne: ['$$this.provider', identity.provider] },
                },
              },
              [{ $literal: identity }],
            ],
          },
        },
      },
    ], { updatePipeline: true })
    return result.matchedCount === 1
  } catch (error) {
    if (error instanceof Error && isDuplicateKeyError(error)) return false
    throw error
  }
}
