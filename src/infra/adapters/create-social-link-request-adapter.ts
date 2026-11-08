import type { CreateSocialLinkRequestPort } from '../../domain/ports/social-login-output-ports.js'
import { SocialLinkRequestModel } from '../schemas/social-link-requests-schema.js'

// Only the newest link of an identity is valid.
export const createSocialLinkRequest: CreateSocialLinkRequestPort = async ({ now, ...request }) => {
  await SocialLinkRequestModel.updateMany(
    { provider: { $eq: request.provider }, subject: { $eq: request.subject }, usedAt: null },
    { $set: { usedAt: now } },
  )
  await SocialLinkRequestModel.create({ ...request, createdAt: now })
}
