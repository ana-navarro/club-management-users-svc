import { createHmac } from 'node:crypto'
import { z } from 'zod'
import type { FacebookConfig } from '../../config/load-env-config.js'
import type { ProviderIdentity } from '../../domain/models/social-identity-model.js'
import { graphUrl } from './exchange-facebook-code-adapter.js'
import { requestProviderJson } from './request-provider-json-adapter.js'

const profileSchema = z.object({ id: z.string().min(1), name: z.string().optional(), email: z.string().optional() })

export type GetFacebookProfile = (accessToken: string) => Promise<ProviderIdentity>

// appsecret_proof proves the token belongs to this app, so a token of another app is refused.
export function createAppSecretProof(appSecret: string, accessToken: string): string {
  return createHmac('sha256', appSecret).update(accessToken).digest('hex')
}

export function createGetFacebookProfile(config: FacebookConfig): GetFacebookProfile {
  return async (accessToken) => {
    const url = graphUrl(config, '/me', {
      fields: 'id,name,email',
      access_token: accessToken,
      appsecret_proof: createAppSecretProof(config.appSecret, accessToken),
    })
    const profile = await requestProviderJson(url, { method: 'GET' }, profileSchema)
    return {
      provider: 'facebook',
      subject: profile.id,
      email: profile.email ?? null,
      // Facebook has no verification field, so the email alone never links an account (FR-014c).
      emailVerified: false,
      name: profile.name ?? '',
    }
  }
}
