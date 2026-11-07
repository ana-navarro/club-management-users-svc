import type { Session, TokenClaims } from '../models/session-model.js'
import type { Language, PublicUser, Theme, UserType } from '../models/user-model.js'

export type LoginInput = {
  email: string
  password: string
  userType: UserType
  ip?: string
  userAgent?: string
  language?: Language
}

export type LoginOutput = Session & { user: PublicUser }

export type PreferencesInput = { theme?: Theme; language?: Language }

export interface LoginUserInputPort {
  execute(input: LoginInput): Promise<LoginOutput>
}

export interface RefreshTokenInputPort {
  execute(claims: TokenClaims): Promise<Session>
}

export interface RequestPasswordResetInputPort {
  execute(input: { email: string; language?: Language }): void
}

export interface ResetPasswordInputPort {
  execute(input: { token: string; password: string }): Promise<void>
}

export interface GetCurrentUserInputPort {
  execute(claims: TokenClaims): Promise<PublicUser>
}

export interface UpdateUserPreferencesInputPort {
  execute(claims: TokenClaims, preferences: PreferencesInput): Promise<PublicUser>
}
