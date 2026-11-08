import { InvalidVerificationLinkError } from '../models/auth-errors-model.js'
import type { HashResetTokenPort, NowPort } from '../ports/auth-output-ports.js'
import type { VerifyEmailInputPort } from '../ports/registration-input-ports.js'
import type { ConsumeEmailVerificationTokenPort, MarkEmailVerifiedPort } from '../ports/registration-output-ports.js'

export type VerifyEmailDependencies = {
  hashToken: HashResetTokenPort
  consumeEmailVerificationToken: ConsumeEmailVerificationTokenPort
  markEmailVerified: MarkEmailVerifiedPort
  now: NowPort
}

export class VerifyEmailUsecase implements VerifyEmailInputPort {
  private readonly deps: VerifyEmailDependencies

  constructor(deps: VerifyEmailDependencies) {
    this.deps = deps
  }

  async execute(input: { token: string }): Promise<void> {
    const { deps } = this
    const now = deps.now()
    const userId = await deps.consumeEmailVerificationToken(deps.hashToken(input.token), now)
    if (!userId) throw new InvalidVerificationLinkError()
    await deps.markEmailVerified(userId, now)
  }
}
