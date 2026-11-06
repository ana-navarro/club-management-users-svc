import { InvalidResetLinkError, WeakPasswordError } from '../models/auth-errors-model.js'
import { MINIMUM_PASSWORD_LENGTH } from '../models/user-model.js'
import type { ResetPasswordInputPort } from '../ports/auth-input-ports.js'
import type {
  FindPasswordResetTokenPort,
  HashPasswordPort,
  HashResetTokenPort,
  InvalidatePasswordResetTokensPort,
  MarkPasswordResetTokenUsedPort,
  NowPort,
  UpdateUserPasswordPort,
} from '../ports/auth-output-ports.js'

export type ResetPasswordDependencies = {
  hashResetToken: HashResetTokenPort
  findPasswordResetToken: FindPasswordResetTokenPort
  markPasswordResetTokenUsed: MarkPasswordResetTokenUsedPort
  invalidatePasswordResetTokens: InvalidatePasswordResetTokensPort
  hashPassword: HashPasswordPort
  updateUserPassword: UpdateUserPasswordPort
  now: NowPort
}

export class ResetPasswordUsecase implements ResetPasswordInputPort {
  private readonly deps: ResetPasswordDependencies

  constructor(deps: ResetPasswordDependencies) {
    this.deps = deps
  }

  async execute(input: { token: string; password: string }): Promise<void> {
    const { deps } = this
    const now = deps.now()
    const resetToken = await deps.findPasswordResetToken(deps.hashResetToken(input.token))

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= now) throw new InvalidResetLinkError()

    // Checked before using the link, so a refused password does not spend it.
    if (input.password.length < MINIMUM_PASSWORD_LENGTH) throw new WeakPasswordError()

    const passwordHash = await deps.hashPassword(input.password)
    const marked = await deps.markPasswordResetTokenUsed(resetToken.id, now)
    if (!marked) throw new InvalidResetLinkError()

    await deps.updateUserPassword(resetToken.userId, passwordHash)
    await deps.invalidatePasswordResetTokens(resetToken.userId, now)
  }
}
