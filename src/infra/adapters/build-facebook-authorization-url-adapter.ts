import type { BuildAuthorizationUrlPort } from '../../domain/ports/social-login-output-ports.js'
import type { FacebookConfig } from '../../config/load-env-config.js'
import { createRedirectUri } from './request-provider-json-adapter.js'

// Facebook Login is not OpenID Connect on the web, so there is no nonce (research R5).
export function createBuildFacebookAuthorizationUrl(
  config: FacebookConfig,
  clientAppUrl: string,
): BuildAuthorizationUrlPort {
  return ({ state, challenge }) => {
    const url = new URL(config.authorizeUrl)
    url.search = new URLSearchParams({
      client_id: config.appId,
      redirect_uri: createRedirectUri(clientAppUrl, 'facebook'),
      response_type: 'code',
      scope: config.scope,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).toString()
    return url.toString()
  }
}
