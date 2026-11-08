import { ProviderUnavailableError } from '../models/auth-errors-model.js'
import { OAUTH_STATE_MINUTES } from '../models/social-identity-model.js'
import type { HashResetTokenPort, NowPort } from '../ports/auth-output-ports.js'
import type { StartSocialLoginInput, StartSocialLoginInputPort } from '../ports/social-login-input-ports.js'
import type {
  CreateOAuthStatePort,
  GeneratePkcePort,
  GenerateRandomValuePort,
  SocialProvidersPorts,
} from '../ports/social-login-output-ports.js'

export type StartSocialLoginDependencies = {
  providers: SocialProvidersPorts
  generateState: GenerateRandomValuePort
  generateNonce: GenerateRandomValuePort
  generatePkce: GeneratePkcePort
  hashValue: HashResetTokenPort
  createOAuthState: CreateOAuthStatePort
  now: NowPort
}

// Research R1: authorization code with PKCE and state, plus a nonce for Google. Only hashes of the
// state and of the browser binding are stored, and the verifier never leaves this service.
export class StartSocialLoginUsecase implements StartSocialLoginInputPort {
  private readonly deps: StartSocialLoginDependencies

  constructor(deps: StartSocialLoginDependencies) {
    this.deps = deps
  }

  async execute(input: StartSocialLoginInput): Promise<{ url: string }> {
    const { deps } = this
    const provider = deps.providers[input.provider]
    if (!provider) throw new ProviderUnavailableError(false)

    const state = deps.generateState()
    const nonce = deps.generateNonce()
    const { verifier, challenge } = deps.generatePkce()
    await deps.createOAuthState({
      stateHash: deps.hashValue(state),
      bindingHash: deps.hashValue(input.binding),
      provider: input.provider,
      codeVerifier: verifier,
      nonce: input.provider === 'google' ? nonce : null,
      language: input.language ?? null,
      expiresAt: new Date(deps.now().getTime() + OAUTH_STATE_MINUTES * 60 * 1000),
    })
    return { url: provider.buildAuthorizationUrl({ state, challenge, nonce }) }
  }
}
