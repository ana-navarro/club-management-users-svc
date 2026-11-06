import { InvalidCredentialsError } from '../models/auth-errors-model.js'
import { getSessionTimes, toTokenClaims } from '../models/session-model.js'
import {
  MAXIMUM_LOGIN_ATTEMPTS,
  PASSWORD_RESET_LINK_HOURS,
  getNetworkPrefix,
  normalizeEmail,
  resolveLanguage,
  toPublicUser,
  type User,
} from '../models/user-model.js'
import type { LoginInput, LoginOutput, LoginUserInputPort } from '../ports/auth-input-ports.js'
import type {
  AddKnownNetworkPort,
  ClearFailedLoginsPort,
  CreatePasswordResetTokenPort,
  FindUserByEmailPort,
  GenerateResetTokenPort,
  GenerateSessionIdPort,
  HashNetworkPort,
  NowPort,
  RecordFailedLoginPort,
  RunInBackgroundPort,
  SendLoginAttemptsEmailPort,
  SendNewLocationEmailPort,
  SignTokenPort,
  VerifyPasswordPort,
} from '../ports/auth-output-ports.js'

export type LoginUserDependencies = {
  findUserByEmail: FindUserByEmailPort
  verifyPassword: VerifyPasswordPort
  recordFailedLogin: RecordFailedLoginPort
  clearFailedLogins: ClearFailedLoginsPort
  addKnownNetwork: AddKnownNetworkPort
  hashNetwork: HashNetworkPort
  generateResetToken: GenerateResetTokenPort
  createPasswordResetToken: CreatePasswordResetTokenPort
  sendLoginAttemptsEmail: SendLoginAttemptsEmailPort
  sendNewLocationEmail: SendNewLocationEmailPort
  generateSessionId: GenerateSessionIdPort
  signToken: SignTokenPort
  runInBackground: RunInBackgroundPort
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

    if (!user) {
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

    await deps.clearFailedLogins(user.id)
    await this.checkNetwork(user, input, now)

    const sessionTimes = getSessionTimes(now, now)
    const token = deps.signToken(toTokenClaims(user, deps.generateSessionId(), now), now, sessionTimes.expiresAt)

    return { token, ...sessionTimes, user: toPublicUser(user) }
  }

  private async checkNetwork(user: User, input: LoginInput, now: Date): Promise<void> {
    const { deps } = this
    const prefix = getNetworkPrefix(input.ip)
    if (!prefix) return

    const networkHash = deps.hashNetwork(prefix)
    if (user.knownNetworks.includes(networkHash)) return

    await deps.addKnownNetwork(user.id, networkHash)
    if (user.knownNetworks.length === 0) return

    deps.runInBackground(async () => {
      const token = await this.createResetLink(user, now)
      await deps.sendNewLocationEmail({
        to: user.email,
        language: resolveLanguage(user.language, input.language),
        token,
        when: now,
        userAgent: input.userAgent,
      })
    })
  }

  private sendLoginAttemptsEmail(user: User, input: LoginInput, now: Date): void {
    const { deps } = this
    deps.runInBackground(async () => {
      const token = await this.createResetLink(user, now)
      await deps.sendLoginAttemptsEmail({
        to: user.email,
        language: resolveLanguage(user.language, input.language),
        token,
        attempts: MAXIMUM_LOGIN_ATTEMPTS,
      })
    })
  }

  private async createResetLink(user: User, now: Date): Promise<string> {
    const { token, tokenHash } = this.deps.generateResetToken()
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_LINK_HOURS * 60 * 60 * 1000)
    await this.deps.createPasswordResetToken({ userId: user.id, tokenHash, expiresAt })
    return token
  }
}
