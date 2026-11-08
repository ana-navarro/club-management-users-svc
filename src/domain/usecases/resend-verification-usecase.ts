import { normalizeEmail, resolveLanguage, type Language } from '../models/user-model.js'
import type { FindUserByEmailPort, NowPort, RunInBackgroundPort } from '../ports/auth-output-ports.js'
import type { ResendVerificationInputPort } from '../ports/registration-input-ports.js'
import type { ClaimVerificationResendPort } from '../ports/registration-output-ports.js'
import { sendVerificationLink, type SendVerificationLinkDependencies } from './send-verification-link-usecase.js'

export type ResendVerificationDependencies = SendVerificationLinkDependencies & {
  findUserByEmail: FindUserByEmailPort
  claimVerificationResend: ClaimVerificationResendPort
  runInBackground: RunInBackgroundPort
  now: NowPort
}

export class ResendVerificationUsecase implements ResendVerificationInputPort {
  private readonly deps: ResendVerificationDependencies

  constructor(deps: ResendVerificationDependencies) {
    this.deps = deps
  }

  // Everything runs in the background, so the response never reveals the account.
  execute(input: { email: string; language?: Language }): void {
    this.deps.runInBackground(() => this.process(input))
  }

  private async process(input: { email: string; language?: Language }): Promise<void> {
    const { deps } = this
    const user = await deps.findUserByEmail(normalizeEmail(input.email))
    if (!user || user.type !== 'CLIENT' || user.emailVerifiedAt !== null) return

    const now = deps.now()
    if (!(await deps.claimVerificationResend(user.id, now))) return
    await sendVerificationLink(deps, user, resolveLanguage(user.language, input.language), now)
  }
}
