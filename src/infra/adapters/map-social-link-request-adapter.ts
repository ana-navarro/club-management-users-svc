import type mongoose from 'mongoose'
import { toSocialProvider } from '../../domain/models/social-identity-model.js'
import { toLanguage } from '../../domain/models/user-model.js'
import type { SocialLinkRequest } from '../../domain/ports/social-login-output-ports.js'

export type SocialLinkRequestDocument = {
  _id: mongoose.Types.ObjectId
  provider: string
  subject: string
  email: string
  profileName: string
  language?: string | null
}

export function mapSocialLinkRequest(document: SocialLinkRequestDocument): SocialLinkRequest | null {
  const provider = toSocialProvider(document.provider)
  if (!provider) return null
  return {
    id: document._id.toString(),
    provider,
    subject: document.subject,
    email: document.email,
    profileName: document.profileName,
    language: toLanguage(document.language),
  }
}
