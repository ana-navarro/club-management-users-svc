import {
  MAXIMUM_PASSWORD_RESET_REQUESTS,
  PASSWORD_RESET_LINK_HOURS,
  normalizeEmail,
  resolveLanguage,
  type Language,
} from '../models/user-model.js'
import type { RequestPasswordResetInputPort } from '../ports/auth-input-ports.js'
import type {
  CreatePasswordResetTokenPort,
  FindUserByEmailPort,
  GenerateResetTokenPort,
  IncrementPasswordResetRequestsPort,
  InvalidatePasswordResetTokensPort,
  NowPort,
  RunInBackgroundPort,
  SendPasswordResetEmailPort,
} from '../ports/auth-output-ports.js'

export type RequestPasswordResetDependencies = {
  findUserByEmail: FindUserByEmailPort
  incrementPasswordResetRequests: IncrementPasswordResetRequestsPort
  invalidatePasswordResetTokens: InvalidatePasswordResetTokensPort
  generateResetToken: GenerateResetTokenPort
  createPasswordResetToken: CreatePasswordResetTokenPort
  sendPasswordResetEmail: SendPasswordResetEmailPort
  runInBackground: RunInBackgroundPort
  now: NowPort
}

export class RequestPasswordResetUsecase implements RequestPasswordResetInputPort {
  private readonly deps: RequestPasswordResetDependencies

  constructor(deps: RequestPasswordResetDependencies) {
    this.deps = deps
  }

  // Everything runs in the background, so the response is the same in every case.
  execute(input: { email: string; language?: Language }): void {
    this.deps.runInBackground(() => this.process(input))
  }

  private async process(input: { email: string; language?: Language }): Promise<void> {
    const { deps } = this
    const user = await deps.findUserByEmail(normalizeEmail(input.email))
    if (!user) return

    const now = deps.now()
    const requests = await deps.incrementPasswordResetRequests(user.id, now)
    if (requests > MAXIMUM_PASSWORD_RESET_REQUESTS) return

    await deps.invalidatePasswordResetTokens(user.id, now)
    const { token, tokenHash } = deps.generateResetToken()
    await deps.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(now.getTime() + PASSWORD_RESET_LINK_HOURS * 60 * 60 * 1000),
    })
    await deps.sendPasswordResetEmail({
      to: user.email,
      language: resolveLanguage(user.language, input.language),
      token,
    })
  }
}
