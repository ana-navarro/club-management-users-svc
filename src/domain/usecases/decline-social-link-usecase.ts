import type { HashResetTokenPort, NowPort } from '../ports/auth-output-ports.js'
import type { DeclineSocialLinkInputPort } from '../ports/social-login-input-ports.js'
import type { ConsumeSocialLinkRequestPort } from '../ports/social-login-output-ports.js'

export type DeclineSocialLinkDependencies = {
  hashValue: HashResetTokenPort
  consumeSocialLinkRequest: ConsumeSocialLinkRequestPort
  now: NowPort
}

// "This was not me": the link stops working and nothing is linked. It answers the same for any token.
export class DeclineSocialLinkUsecase implements DeclineSocialLinkInputPort {
  private readonly deps: DeclineSocialLinkDependencies

  constructor(deps: DeclineSocialLinkDependencies) {
    this.deps = deps
  }

  async execute(input: { token: string }): Promise<void> {
    await this.deps.consumeSocialLinkRequest(this.deps.hashValue(input.token), this.deps.now())
  }
}
