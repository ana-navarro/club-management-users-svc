import { assertActiveSession, type TokenClaims } from '../models/session-model.js'
import { toPublicUser, type PublicUser } from '../models/user-model.js'
import type { PreferencesInput, UpdateUserPreferencesInputPort } from '../ports/auth-input-ports.js'
import type { FindUserByIdPort, UpdateUserPreferencesPort } from '../ports/auth-output-ports.js'

export type UpdateUserPreferencesDependencies = {
  findUserById: FindUserByIdPort
  updateUserPreferences: UpdateUserPreferencesPort
}

export class UpdateUserPreferencesUsecase implements UpdateUserPreferencesInputPort {
  private readonly deps: UpdateUserPreferencesDependencies

  constructor(deps: UpdateUserPreferencesDependencies) {
    this.deps = deps
  }

  async execute(claims: TokenClaims, preferences: PreferencesInput): Promise<PublicUser> {
    const current = await this.deps.findUserById(claims.userId)
    assertActiveSession(current, claims)

    await this.deps.updateUserPreferences(claims.userId, preferences)

    const updated = await this.deps.findUserById(claims.userId)
    assertActiveSession(updated, claims)
    return toPublicUser(updated)
  }
}
