import mongoose from 'mongoose'
import { toSocialProvider, type SocialIdentity } from '../../domain/models/social-identity-model.js'
import { toLanguage, toTheme, toUserType, type User } from '../../domain/models/user-model.js'
import { ClubModel } from '../schemas/clubs-schema.js'

export type UserDocument = {
  _id: mongoose.Types.ObjectId
  name: string
  email: string
  passwordHash?: string | null
  type: string
  clubIds: mongoose.Types.ObjectId[]
  theme?: string | null
  language?: string | null
  tokenVersion: number
  lockedUntil?: Date | null
  knownNetworks: string[]
  emailVerifiedAt?: Date | null
  verificationEmailSentAt?: Date | null
  socialIdentities?: { provider: string; subject: string; linkedAt: Date }[] | null
}

function mapSocialIdentities(documents: UserDocument['socialIdentities']): SocialIdentity[] {
  return (documents ?? []).flatMap((identity) => {
    const provider = toSocialProvider(identity.provider)
    return provider ? [{ provider, subject: identity.subject, linkedAt: identity.linkedAt }] : []
  })
}

export async function mapUser(document: UserDocument): Promise<User> {
  const clubs = await ClubModel.find({ _id: { $in: document.clubIds } }).lean()
  return {
    id: document._id.toString(),
    name: document.name,
    email: document.email,
    passwordHash: document.passwordHash ?? null,
    type: toUserType(document.type),
    clubs: clubs.map((club) => ({ id: club._id.toString(), name: club.name })),
    theme: toTheme(document.theme),
    language: toLanguage(document.language),
    tokenVersion: document.tokenVersion,
    lockedUntil: document.lockedUntil ?? null,
    knownNetworks: document.knownNetworks,
    emailVerifiedAt: document.emailVerifiedAt ?? null,
    verificationEmailSentAt: document.verificationEmailSentAt ?? null,
    socialIdentities: mapSocialIdentities(document.socialIdentities),
  }
}
