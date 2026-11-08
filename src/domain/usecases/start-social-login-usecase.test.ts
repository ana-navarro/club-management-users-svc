import { describe, expect, it, vi } from 'vitest'
import { ProviderUnavailableError } from '../models/auth-errors-model.js'
import type { SocialProviderPorts } from '../ports/social-login-output-ports.js'
import { StartSocialLoginUsecase, type StartSocialLoginDependencies } from './start-social-login-usecase.js'

const NOW = new Date('2026-01-01T10:00:00Z')

const makeProvider = (): SocialProviderPorts => ({
  buildAuthorizationUrl: vi.fn(({ state, challenge, nonce }) => `https://provider.test/?${state}&${challenge}&${nonce}`),
  fetchIdentity: vi.fn(),
})

const makeDeps = (overrides: Partial<StartSocialLoginDependencies> = {}): StartSocialLoginDependencies => ({
  providers: { google: makeProvider(), facebook: makeProvider() },
  generateState: () => 'state',
  generateNonce: () => 'nonce',
  generatePkce: () => ({ verifier: 'verifier', challenge: 'challenge' }),
  hashValue: (value: string) => `hash:${value}`,
  createOAuthState: vi.fn(async () => undefined),
  now: () => NOW,
  ...overrides,
})

describe('StartSocialLoginUsecase', () => {
  it('stores hashes of the state and of the binding, with a nonce for Google, and returns the URL', async () => {
    const deps = makeDeps()
    const result = await new StartSocialLoginUsecase(deps).execute({ provider: 'google', binding: 'b', language: 'en' })

    expect(result).toEqual({ url: 'https://provider.test/?state&challenge&nonce' })
    expect(deps.createOAuthState).toHaveBeenCalledWith({
      stateHash: 'hash:state',
      bindingHash: 'hash:b',
      provider: 'google',
      codeVerifier: 'verifier',
      nonce: 'nonce',
      language: 'en',
      expiresAt: new Date('2026-01-01T10:10:00Z'),
    })
  })

  it('stores no nonce for Facebook and no language when the session has none', async () => {
    const deps = makeDeps()
    await new StartSocialLoginUsecase(deps).execute({ provider: 'facebook', binding: 'b' })
    expect(deps.createOAuthState).toHaveBeenCalledWith(expect.objectContaining({ nonce: null, language: null }))
  })

  it('answers provider_unavailable, as not configured, for a provider without credentials', async () => {
    const deps = makeDeps({ providers: { google: null, facebook: makeProvider() } })
    const result = new StartSocialLoginUsecase(deps).execute({ provider: 'google', binding: 'b' })
    await expect(result).rejects.toThrow(ProviderUnavailableError)
    await expect(result).rejects.toMatchObject({ configured: false })
    expect(deps.createOAuthState).not.toHaveBeenCalled()
  })
})
