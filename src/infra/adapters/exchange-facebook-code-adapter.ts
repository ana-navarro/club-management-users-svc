import { z } from 'zod'
import type { FacebookConfig } from '../../config/load-env-config.js'
import { createRedirectUri, requestProviderJson } from './request-provider-json-adapter.js'

const tokenResponseSchema = z.object({ access_token: z.string().min(1) })

export type ExchangeFacebookCode = (input: { code: string; verifier: string }) => Promise<string>

export function graphUrl(config: FacebookConfig, path: string, params: Record<string, string>): string {
  const url = new URL(`${config.graphUrl.replace(/\/$/, '')}/${config.graphVersion}${path}`)
  url.search = new URLSearchParams(params).toString()
  return url.toString()
}

// Trades the code for an access token. The token is used once, for the profile, and never stored.
export function createExchangeFacebookCode(config: FacebookConfig, clientAppUrl: string): ExchangeFacebookCode {
  return async ({ code, verifier }) => {
    const url = graphUrl(config, '/oauth/access_token', {
      client_id: config.appId,
      client_secret: config.appSecret,
      redirect_uri: createRedirectUri(clientAppUrl, 'facebook'),
      code,
      code_verifier: verifier,
    })
    const response = await requestProviderJson(url, { method: 'GET' }, tokenResponseSchema)
    return response.access_token
  }
}
