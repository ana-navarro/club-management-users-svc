import { createRemoteJWKSet, jwtVerify } from 'jose'
import { z } from 'zod'
import type { GoogleConfig } from '../../config/load-env-config.js'
import { ProviderUnavailableError } from '../../domain/models/auth-errors-model.js'
import type { ProviderIdentity } from '../../domain/models/social-identity-model.js'

const claimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string().optional(),
  // Google sends a boolean, but some libraries document a string.
  email_verified: z.union([z.boolean(), z.enum(['true', 'false'])]).optional(),
  name: z.string().optional(),
  nonce: z.string().optional(),
})

export type VerifyGoogleIdToken = (input: { idToken: string; nonce: string | null }) => Promise<ProviderIdentity>

// Checks the signature against the JWKS, the issuer, the audience, the expiry and the nonce (research R4).
export function createVerifyGoogleIdToken(config: GoogleConfig): VerifyGoogleIdToken {
  const keys = createRemoteJWKSet(new URL(config.jwksUrl))

  return async ({ idToken, nonce }) => {
    let payload: z.infer<typeof claimsSchema>
    try {
      const verified = await jwtVerify(idToken, keys, { issuer: config.issuers, audience: config.clientId })
      payload = claimsSchema.parse(verified.payload)
    } catch {
      throw new ProviderUnavailableError()
    }
    if (!nonce || payload.nonce !== nonce) throw new ProviderUnavailableError()

    return {
      provider: 'google',
      subject: payload.sub,
      email: payload.email ?? null,
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      name: payload.name ?? '',
    }
  }
}
