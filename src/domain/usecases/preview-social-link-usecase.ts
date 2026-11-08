import { InvalidSocialLinkError } from '../models/auth-errors-model.js'
import type { HashResetTokenPort, NowPort } from '../ports/auth-output-ports.js'
import type { PreviewSocialLinkInputPort, SocialLinkPreview } from '../ports/social-login-input-ports.js'
import type { FindSocialLinkRequestPort } from '../ports/social-login-output-ports.js'

export type PreviewSocialLinkDependencies = {
  hashValue: HashResetTokenPort
  findSocialLinkRequest: FindSocialLinkRequestPort
  now: NowPort
}

// Only reads: mail scanners open links on their own, so opening the page confirms nothing (research R5a).
export class PreviewSocialLinkUsecase implements PreviewSocialLinkInputPort {
  private readonly deps: PreviewSocialLinkDependencies

  constructor(deps: PreviewSocialLinkDependencies) {
    this.deps = deps
  }

  async execute(input: { token: string }): Promise<SocialLinkPreview> {
    const { deps } = this
    const request = await deps.findSocialLinkRequest(deps.hashValue(input.token), deps.now())
    if (!request) throw new InvalidSocialLinkError()
    return { provider: request.provider, profileName: request.profileName, email: request.email }
  }
}
