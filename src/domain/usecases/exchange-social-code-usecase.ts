import { InvalidSocialCodeError } from '../models/auth-errors-model.js'
import { getSessionTimes, toTokenClaims } from '../models/session-model.js'
import { toPublicUser } from '../models/user-model.js'
import type { LoginOutput } from '../ports/auth-input-ports.js'
import type {
  FindUserByIdPort,
  GenerateSessionIdPort,
  HashResetTokenPort,
  NowPort,
  SignTokenPort,
} from '../ports/auth-output-ports.js'
import type { ExchangeSocialCodeInputPort } from '../ports/social-login-input-ports.js'
import type { ConsumeSocialLoginCodePort } from '../ports/social-login-output-ports.js'

export type ExchangeSocialCodeDependencies = {
  hashValue: HashResetTokenPort
  consumeSocialLoginCode: ConsumeSocialLoginCodePort
  findUserById: FindUserByIdPort
  generateSessionId: GenerateSessionIdPort
  signToken: SignTokenPort
  now: NowPort
}

// Opens the same session as the password login, with a new session id and the 001 rules (FR-013).
export class ExchangeSocialCodeUsecase implements ExchangeSocialCodeInputPort {
  private readonly deps: ExchangeSocialCodeDependencies

  constructor(deps: ExchangeSocialCodeDependencies) {
    this.deps = deps
  }

  async execute(input: { code: string }): Promise<LoginOutput> {
    const { deps } = this
    const now = deps.now()
    const userId = await deps.consumeSocialLoginCode(deps.hashValue(input.code), now)
    if (!userId) throw new InvalidSocialCodeError()
    const user = await deps.findUserById(userId)
    if (!user || user.type !== 'CLIENT') throw new InvalidSocialCodeError()

    const times = getSessionTimes(now, now)
    const token = deps.signToken(toTokenClaims(user, deps.generateSessionId(), now), now, times.expiresAt)
    return { token, ...times, user: toPublicUser(user) }
  }
}
