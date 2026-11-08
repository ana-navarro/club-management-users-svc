import { InvalidCredentialsError, InvalidSocialLinkError } from '../models/auth-errors-model.js'
import type { HashResetTokenPort, NowPort } from '../ports/auth-output-ports.js'
import type { ConfirmSocialLinkInputPort } from '../ports/social-login-input-ports.js'
import type { ConsumeSocialLinkRequestPort, FindUserBySocialIdentityPort } from '../ports/social-login-output-ports.js'
import { linkSocialAccount, type LinkSocialAccountDependencies } from './link-social-account-usecase.js'

export type ConfirmSocialLinkDependencies = LinkSocialAccountDependencies & {
  hashValue: HashResetTokenPort
  consumeSocialLinkRequest: ConsumeSocialLinkRequestPort
  findUserBySocialIdentity: FindUserBySocialIdentityPort
  now: NowPort
}

// The link reached the inbox, which proves the email, so the identity is linked with the rules of
// research R6 and R7. No session opens here: the person enters with Facebook again (research R5a).
export class ConfirmSocialLinkUsecase implements ConfirmSocialLinkInputPort {
  private readonly deps: ConfirmSocialLinkDependencies

  constructor(deps: ConfirmSocialLinkDependencies) {
    this.deps = deps
  }

  async execute(input: { token: string }): Promise<void> {
    const { deps } = this
    const now = deps.now()
    const request = await deps.consumeSocialLinkRequest(deps.hashValue(input.token), now)
    if (!request) throw new InvalidSocialLinkError()

    let userId: string
    try {
      const user = await linkSocialAccount(
        deps,
        {
          identity: { provider: request.provider, subject: request.subject, linkedAt: now },
          email: request.email,
          name: request.profileName,
          language: request.language,
          replace: true,
        },
        now,
      )
      userId = user.id
    } catch (error) {
      // The email now belongs to an administrator.
      if (error instanceof InvalidCredentialsError) throw new InvalidSocialLinkError()
      throw error
    }

    // The identity was linked to another account in the meantime.
    const owner = await deps.findUserBySocialIdentity(request.provider, request.subject)
    if (owner?.id !== userId) throw new InvalidSocialLinkError()
  }
}
