import { EmailNotVerifiedError, InvalidCredentialsError } from '../models/auth-errors-model.js'
import { getSessionTimes, toTokenClaims } from '../models/session-model.js'
import { MAXIMUM_LOGIN_ATTEMPTS, normalizeEmail, resolveLanguage, toPublicUser, type User } from '../models/user-model.js'
import type { LoginInput, LoginOutput, LoginUserInputPort } from '../ports/auth-input-ports.js'
import type {
  ClearFailedLoginsPort,
  FindUserByEmailPort,
  GenerateSessionIdPort,
  NowPort,
  RecordFailedLoginPort,
  SendLoginAttemptsEmailPort,
  SignTokenPort,
  VerifyPasswordPort,
} from '../ports/auth-output-ports.js'
import { checkNewNetwork, createResetLinkToken, type CheckNewNetworkDependencies } from './check-new-network-usecase.js'

export type LoginUserDependencies = CheckNewNetworkDependencies & {
  findUserByEmail: FindUserByEmailPort
  verifyPassword: VerifyPasswordPort
  recordFailedLogin: RecordFailedLoginPort
  clearFailedLogins: ClearFailedLoginsPort
  sendLoginAttemptsEmail: SendLoginAttemptsEmailPort
  generateSessionId: GenerateSessionIdPort
  signToken: SignTokenPort
  now: NowPort
  dummyPasswordHash: string
}

export class LoginUserUsecase implements LoginUserInputPort {
  private readonly deps: LoginUserDependencies

  constructor(deps: LoginUserDependencies) {
    this.deps = deps
  }

  async execute(input: LoginInput): Promise<LoginOutput> {
    const { deps } = this
    const now = deps.now()
    const user = await deps.findUserByEmail(normalizeEmail(input.email))

    // An account without a password, created by a provider, answers like an unknown email.
    if (!user || user.passwordHash === null) {
      // Spends the same time as a real check, so timing does not reveal the account.
      await deps.verifyPassword(deps.dummyPasswordHash, input.password)
      throw new InvalidCredentialsError()
    }

    const passwordMatches = await deps.verifyPassword(user.passwordHash, input.password)

    if (user.lockedUntil && user.lockedUntil > now) throw new InvalidCredentialsError()

    if (!passwordMatches) {
      const { locked } = await deps.recordFailedLogin(user.id, now)
      if (locked) this.sendLoginAttemptsEmail(user, input, now)
      throw new InvalidCredentialsError()
    }

    if (user.type !== input.userType) throw new InvalidCredentialsError()

    // Only after the right password, and without counting a failure (research R8).
    if (user.type === 'CLIENT' && user.emailVerifiedAt === null) throw new EmailNotVerifiedError()

    await deps.clearFailedLogins(user.id)
    await checkNewNetwork(deps, user, input, now)

    const sessionTimes = getSessionTimes(now, now)
    const token = deps.signToken(toTokenClaims(user, deps.generateSessionId(), now), now, sessionTimes.expiresAt)

    return { token, ...sessionTimes, user: toPublicUser(user) }
  }

  private sendLoginAttemptsEmail(user: User, input: LoginInput, now: Date): void {
    const { deps } = this
    deps.runInBackground(async () => {
      const token = await createResetLinkToken(deps, user, now)
      await deps.sendLoginAttemptsEmail({
        to: user.email,
        userType: user.type,
        language: resolveLanguage(user.language, input.language),
        token,
        attempts: MAXIMUM_LOGIN_ATTEMPTS,
      })
    })
  }
}
