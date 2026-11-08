import type { ConsumeSocialLinkRequestPort } from '../../domain/ports/social-login-output-ports.js'
import { SocialLinkRequestModel } from '../schemas/social-link-requests-schema.js'
import { mapSocialLinkRequest } from './map-social-link-request-adapter.js'

// Used by the confirmation and the decline. One atomic update, so only one of them gets the request.
export const consumeSocialLinkRequest: ConsumeSocialLinkRequestPort = async (tokenHash, now) => {
  const document = await SocialLinkRequestModel.findOneAndUpdate(
    { tokenHash: { $eq: tokenHash }, usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
  ).lean()
  return document ? mapSocialLinkRequest(document) : null
}
