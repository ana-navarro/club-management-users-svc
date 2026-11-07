import { assertActiveSession, getSessionTimes, toTokenClaims, type Session, type TokenClaims } from '../models/session-model.js'
import type { RefreshTokenInputPort } from '../ports/auth-input-ports.js'
import type { FindUserByIdPort, NowPort, SignTokenPort } from '../ports/auth-output-ports.js'

export type RefreshTokenDependencies = {
  findUserById: FindUserByIdPort
  signToken: SignTokenPort
  now: NowPort
}

export class RefreshTokenUsecase implements RefreshTokenInputPort {
  private readonly deps: RefreshTokenDependencies

  constructor(deps: RefreshTokenDependencies) {
    this.deps = deps
  }

  async execute(claims: TokenClaims): Promise<Session> {
    const user = await this.deps.findUserById(claims.userId)
    assertActiveSession(user, claims)

    const now = this.deps.now()
    const times = getSessionTimes(now, claims.sessionStartedAt)
    const token = this.deps.signToken(
      toTokenClaims(user, claims.sessionId, claims.sessionStartedAt),
      now,
      times.expiresAt,
    )
    return { token, ...times }
  }
}
