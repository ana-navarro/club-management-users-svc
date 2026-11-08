import type { BuildAuthorizationUrlPort } from '../../domain/ports/social-login-output-ports.js'
import type { GoogleConfig } from '../../config/load-env-config.js'
import { createRedirectUri } from './request-provider-json-adapter.js'

export function createBuildGoogleAuthorizationUrl(config: GoogleConfig, clientAppUrl: string): BuildAuthorizationUrlPort {
  return ({ state, challenge, nonce }) => {
    const url = new URL(config.authorizeUrl)
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: createRedirectUri(clientAppUrl, 'google'),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      nonce,
      prompt: 'select_account',
    }).toString()
    return url.toString()
  }
}
