import { assertActiveSession, type TokenClaims } from '../models/session-model.js'
import { toPublicUser, type PublicUser } from '../models/user-model.js'
import type { GetCurrentUserInputPort } from '../ports/auth-input-ports.js'
import type { FindUserByIdPort } from '../ports/auth-output-ports.js'

export class GetCurrentUserUsecase implements GetCurrentUserInputPort {
  private readonly findUserById: FindUserByIdPort

  constructor(findUserById: FindUserByIdPort) {
    this.findUserById = findUserById
  }

  async execute(claims: TokenClaims): Promise<PublicUser> {
    const user = await this.findUserById(claims.userId)
    assertActiveSession(user, claims)
    return toPublicUser(user)
  }
}
