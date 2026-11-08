import type { CreateSocialClientUserPort } from '../../domain/ports/social-login-output-ports.js'
import { UserModel } from '../schemas/users-schema.js'
import { isDuplicateKeyError } from './create-client-user-adapter.js'
import { mapUser } from './map-user-adapter.js'

// A client confirmed by the provider, without a password until the person sets one.
export const createSocialClientUser: CreateSocialClientUserPort = async ({ name, email, identity, language, now }) => {
  try {
    const document = await UserModel.create({
      name,
      email,
      passwordHash: null,
      type: 'CLIENT',
      language,
      emailVerifiedAt: now,
      socialIdentities: [identity],
    })
    return mapUser(document.toObject())
  } catch (error) {
    if (error instanceof Error && isDuplicateKeyError(error)) return null
    throw error
  }
}
