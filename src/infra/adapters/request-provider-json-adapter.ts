import type { ZodType } from 'zod'
import { ProviderUnavailableError } from '../../domain/models/auth-errors-model.js'

const TIMEOUT_MS = 10000

// Calls a provider and validates the answer. Network failures, error statuses and unexpected bodies
// all become provider_unavailable, without logging the body, which may carry tokens.
export async function requestProviderJson<T>(url: string, init: RequestInit, schema: ZodType<T>): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch {
    throw new ProviderUnavailableError()
  }
  if (!response.ok) throw new ProviderUnavailableError()
  const parsed = schema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) throw new ProviderUnavailableError()
  return parsed.data
}

export function createRedirectUri(clientAppUrl: string, provider: 'google' | 'facebook'): string {
  return `${clientAppUrl.replace(/\/$/, '')}/api/auth/${provider}/callback`
}
