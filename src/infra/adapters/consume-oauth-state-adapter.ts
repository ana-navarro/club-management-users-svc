import { toLanguage } from '../../domain/models/user-model.js'
import type { ConsumeOAuthStatePort } from '../../domain/ports/social-login-output-ports.js'
import { OAuthStateModel } from '../schemas/oauth-states-schema.js'

// Marked as used before talking to the provider, so a repeated or forged return is refused.
export const consumeOAuthState: ConsumeOAuthStatePort = async ({ stateHash, bindingHash, provider, now }) => {
  const document = await OAuthStateModel.findOneAndUpdate(
    {
      stateHash: { $eq: stateHash },
      bindingHash: { $eq: bindingHash },
      provider: { $eq: provider },
      usedAt: null,
      expiresAt: { $gt: now },
    },
    { $set: { usedAt: now } },
  ).lean()
  if (!document) return null
  return {
    codeVerifier: document.codeVerifier,
    nonce: document.nonce ?? null,
    language: toLanguage(document.language),
  }
}
