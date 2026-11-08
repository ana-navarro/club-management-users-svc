import {
  EmailRequiredError,
  InvalidCredentialsError,
  InvalidStateError,
  ProviderUnavailableError,
  SocialLoginCancelledError,
} from '../models/auth-errors-model.js'
import {
  MAXIMUM_PROFILE_NAME_LENGTH,
  MAXIMUM_SOCIAL_LINK_EMAILS_PER_DAY,
  MAXIMUM_SOCIAL_LINK_REQUESTS_PER_HOUR,
  SOCIAL_LINK_HOURS,
  SOCIAL_LINK_RESEND_SECONDS,
  SOCIAL_LOGIN_CODE_SECONDS,
  type ProviderIdentity,
} from '../models/social-identity-model.js'
import { getNetworkPrefix, normalizeEmail, resolveLanguage, type User } from '../models/user-model.js'
import type { GenerateResetTokenPort, HashResetTokenPort, NowPort } from '../ports/auth-output-ports.js'
import type { IncrementNetworkAttemptsPort } from '../ports/registration-output-ports.js'
import type {
  CompleteSocialLoginInput,
  CompleteSocialLoginInputPort,
  CompleteSocialLoginOutput,
} from '../ports/social-login-input-ports.js'
import type {
  ConsumeOAuthStatePort,
  CountRecentSocialLinkRequestsPort,
  CreateSocialLinkRequestPort,
  CreateSocialLoginCodePort,
  FindUserBySocialIdentityPort,
  OAuthState,
  SendSocialLinkEmailPort,
  SocialProvidersPorts,
} from '../ports/social-login-output-ports.js'
import { checkNewNetwork, type CheckNewNetworkDependencies } from './check-new-network-usecase.js'
import { linkSocialAccount, type LinkSocialAccountDependencies } from './link-social-account-usecase.js'

const HOUR = 60 * 60 * 1000

export type CompleteSocialLoginDependencies = LinkSocialAccountDependencies &
  CheckNewNetworkDependencies & {
    providers: SocialProvidersPorts
    hashValue: HashResetTokenPort
    consumeOAuthState: ConsumeOAuthStatePort
    findUserBySocialIdentity: FindUserBySocialIdentityPort
    generateToken: GenerateResetTokenPort
    createSocialLoginCode: CreateSocialLoginCodePort
    incrementSocialLinkAttempts: IncrementNetworkAttemptsPort
    countRecentSocialLinkRequests: CountRecentSocialLinkRequestsPort
    createSocialLinkRequest: CreateSocialLinkRequestPort
    sendSocialLinkEmail: SendSocialLinkEmailPort
    now: NowPort
  }

// Follows the steps of contracts/users-svc-api.md for POST /auth/social/{provider}/callback.
export class CompleteSocialLoginUsecase implements CompleteSocialLoginInputPort {
  private readonly deps: CompleteSocialLoginDependencies

  constructor(deps: CompleteSocialLoginDependencies) {
    this.deps = deps
  }

  async execute(input: CompleteSocialLoginInput): Promise<CompleteSocialLoginOutput> {
    const { deps } = this
    const now = deps.now()

    // 1. The attempt is spent first, so a repeated or forged return never reaches the provider.
    const state = await deps.consumeOAuthState({
      stateHash: deps.hashValue(input.state),
      bindingHash: deps.hashValue(input.binding),
      provider: input.provider,
      now,
    })
    if (!state) throw new InvalidStateError()

    // 2. The provider answered with an error.
    if (input.error === 'access_denied') throw new SocialLoginCancelledError()
    if (input.error || !input.code) throw new ProviderUnavailableError()

    // 3. Exchange and validate. Google must say the email is verified; Facebook only sends it or not.
    const provider = deps.providers[input.provider]
    if (!provider) throw new ProviderUnavailableError(false)
    const identity = await provider.fetchIdentity({ code: input.code, verifier: state.codeVerifier, nonce: state.nonce })
    if (!identity.email || (identity.provider === 'google' && !identity.emailVerified)) throw new EmailRequiredError()
    const email = normalizeEmail(identity.email)

    // 4. An identity already linked enters its account, even if the email changed at the provider.
    const linked = await deps.findUserBySocialIdentity(identity.provider, identity.subject)
    let user: User
    if (linked) {
      if (linked.type !== 'CLIENT') throw new InvalidCredentialsError()
      user = linked
    } else if (identity.provider === 'facebook') {
      // 5. Facebook does not verify the email: nothing is linked or created before the confirmation.
      await this.requestFacebookLink(identity, email, state, input.ip, now)
      return { status: 'pending' }
    } else {
      user = await linkSocialAccount(
        deps,
        {
          identity: { provider: identity.provider, subject: identity.subject, linkedAt: now },
          email,
          name: this.toName(identity, email),
          language: state.language,
          replace: false,
        },
        now,
      )
    }

    // 6. Same new network warning as the password login, without touching the attempts or the lock.
    await checkNewNetwork(deps, user, { ip: input.ip, userAgent: input.userAgent, language: state.language ?? undefined }, now)

    // 7. A 60 second code that the frontend trades once for the session (research R3).
    const { token, tokenHash } = deps.generateToken()
    await deps.createSocialLoginCode({
      codeHash: tokenHash,
      userId: user.id,
      expiresAt: new Date(now.getTime() + SOCIAL_LOGIN_CODE_SECONDS * 1000),
    })
    return { status: 'session', code: token }
  }

  private toName(identity: ProviderIdentity, email: string): string {
    const name = identity.name.trim().slice(0, MAXIMUM_PROFILE_NAME_LENGTH)
    return name || email.split('@')[0] || email
  }

  // Research R5a. Every case answers pending, so the answer never reveals the account or the limits.
  private async requestFacebookLink(
    identity: ProviderIdentity,
    email: string,
    state: OAuthState,
    ip: string | undefined,
    now: Date,
  ): Promise<void> {
    const { deps } = this

    const prefix = getNetworkPrefix(ip)
    if (prefix) {
      const attempts = await deps.incrementSocialLinkAttempts(deps.hashNetwork(prefix), now)
      if (attempts > MAXIMUM_SOCIAL_LINK_REQUESTS_PER_HOUR) return
    }

    const existing = await deps.findUserByEmail(email)
    if (existing && existing.type !== 'CLIENT') return

    // Inside the minute, the link already sent stays valid and nothing new is created.
    const lastMinute = new Date(now.getTime() - SOCIAL_LINK_RESEND_SECONDS * 1000)
    if ((await deps.countRecentSocialLinkRequests(email, lastMinute)) > 0) return
    const lastDay = new Date(now.getTime() - 24 * HOUR)
    if ((await deps.countRecentSocialLinkRequests(email, lastDay)) >= MAXIMUM_SOCIAL_LINK_EMAILS_PER_DAY) return

    const profileName = this.toName(identity, email)
    const { token, tokenHash } = deps.generateToken()
    await deps.createSocialLinkRequest({
      tokenHash,
      provider: identity.provider,
      subject: identity.subject,
      email,
      profileName,
      language: state.language,
      expiresAt: new Date(now.getTime() + SOCIAL_LINK_HOURS * HOUR),
      now,
    })
    deps.runInBackground(() =>
      deps.sendSocialLinkEmail({
        to: email,
        language: resolveLanguage(existing?.language ?? null, state.language ?? undefined),
        token,
        profileName,
      }),
    )
  }
}
