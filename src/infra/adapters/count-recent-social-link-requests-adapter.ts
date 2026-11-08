import type { CountRecentSocialLinkRequestsPort } from '../../domain/ports/social-login-output-ports.js'
import { SocialLinkRequestModel } from '../schemas/social-link-requests-schema.js'

export const countRecentSocialLinkRequests: CountRecentSocialLinkRequestsPort = (email, since) =>
  SocialLinkRequestModel.countDocuments({ email: { $eq: email }, createdAt: { $gt: since } })
