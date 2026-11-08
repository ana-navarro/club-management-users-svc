import mongoose from 'mongoose'
import { networkAttemptsSchema } from './registration-attempts-schema.js'

// Same shape and window as registrationAttempts: at most 10 Facebook link requests per hour per network.
export const SocialLinkAttemptModel = mongoose.model('SocialLinkAttempt', networkAttemptsSchema, 'socialLinkAttempts')
