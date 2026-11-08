import type { FindSocialLinkRequestPort } from '../../domain/ports/social-login-output-ports.js'
import { SocialLinkRequestModel } from '../schemas/social-link-requests-schema.js'
import { mapSocialLinkRequest } from './map-social-link-request-adapter.js'

// Only reads, so opening the link changes nothing.
export const findSocialLinkRequest: FindSocialLinkRequestPort = async (tokenHash, now) => {
  const document = await SocialLinkRequestModel.findOne({
    tokenHash: { $eq: tokenHash },
    usedAt: null,
    expiresAt: { $gt: now },
  }).lean()
  return document ? mapSocialLinkRequest(document) : null
}
