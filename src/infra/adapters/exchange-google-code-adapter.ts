import { z } from 'zod'
import type { GoogleConfig } from '../../config/load-env-config.js'
import { createRedirectUri, requestProviderJson } from './request-provider-json-adapter.js'

const tokenResponseSchema = z.object({ id_token: z.string().min(1) })

export type ExchangeGoogleCode = (input: { code: string; verifier: string }) => Promise<string>

// Trades the code, with the secret and the PKCE verifier, for the signed id_token (research R4).
export function createExchangeGoogleCode(config: GoogleConfig, clientAppUrl: string): ExchangeGoogleCode {
  return async ({ code, verifier }) => {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: createRedirectUri(clientAppUrl, 'google'),
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code_verifier: verifier,
    })
    const response = await requestProviderJson(
      config.tokenUrl,
      { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      tokenResponseSchema,
    )
    return response.id_token
  }
}
