import { SocialLinkAttemptModel } from '../schemas/social-link-attempts-schema.js'
import { createIncrementNetworkAttempts } from './increment-network-attempts-adapter.js'

export const incrementSocialLinkAttempts = createIncrementNetworkAttempts(SocialLinkAttemptModel)
