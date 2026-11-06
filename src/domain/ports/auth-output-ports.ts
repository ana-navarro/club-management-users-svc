import type { TokenClaims } from '../models/session-model.js'
import type { Language, Theme, User } from '../models/user-model.js'

export type PasswordResetToken = { id: string; userId: string; expiresAt: Date; usedAt: Date | null }

export type FindUserByEmailPort = (email: string) => Promise<User | null>
export type FindUserByIdPort = (id: string) => Promise<User | null>
export type UpdateUserPreferencesPort = (
  id: string,
  preferences: { theme?: Theme; language?: Language },
) => Promise<void>
export type UpdateUserPasswordPort = (id: string, passwordHash: string) => Promise<void>

export type RecordFailedLoginPort = (id: string, now: Date) => Promise<{ locked: boolean }>
export type ClearFailedLoginsPort = (id: string) => Promise<void>
export type AddKnownNetworkPort = (id: string, networkHash: string) => Promise<void>
export type IncrementPasswordResetRequestsPort = (id: string, now: Date) => Promise<number>

export type CreatePasswordResetTokenPort = (input: {
  userId: string
  tokenHash: string
  expiresAt: Date
}) => Promise<void>
export type FindPasswordResetTokenPort = (tokenHash: string) => Promise<PasswordResetToken | null>
export type MarkPasswordResetTokenUsedPort = (id: string, now: Date) => Promise<boolean>
export type InvalidatePasswordResetTokensPort = (userId: string, now: Date) => Promise<void>

export type HashPasswordPort = (password: string) => Promise<string>
export type VerifyPasswordPort = (hash: string, password: string) => Promise<boolean>
export type GenerateResetTokenPort = () => { token: string; tokenHash: string }
export type HashResetTokenPort = (token: string) => string
export type HashNetworkPort = (prefix: string) => string
export type GenerateSessionIdPort = () => string

export type SignTokenPort = (claims: TokenClaims, now: Date, expiresAt: Date) => string
export type VerifyTokenPort = (token: string) => TokenClaims

export type EmailRecipient = { to: string; language: Language; token: string }
export type SendPasswordResetEmailPort = (input: EmailRecipient) => Promise<void>
export type SendLoginAttemptsEmailPort = (input: EmailRecipient & { attempts: number }) => Promise<void>
export type SendNewLocationEmailPort = (
  input: EmailRecipient & { when: Date; userAgent?: string },
) => Promise<void>

export type RunInBackgroundPort = (task: () => Promise<void>) => void
export type NowPort = () => Date
