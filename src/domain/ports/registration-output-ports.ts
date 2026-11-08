import type { Language, User, UserType } from '../models/user-model.js'

// Returns null when the email already has an account, including when a simultaneous sign-up won.
export type CreateClientUserPort = (input: {
  name: string
  email: string
  passwordHash: string
  language: Language | null
}) => Promise<User | null>

// Invalidates the pending links of the user and records when this one was sent.
export type CreateEmailVerificationTokenPort = (input: {
  userId: string
  tokenHash: string
  expiresAt: Date
  now: Date
}) => Promise<void>

// Marks the link as used only if it is unused and not expired. Returns its user id, or null.
export type ConsumeEmailVerificationTokenPort = (tokenHash: string, now: Date) => Promise<string | null>
export type MarkEmailVerifiedPort = (userId: string, now: Date) => Promise<void>
export type InvalidateEmailVerificationTokensPort = (userId: string, now: Date) => Promise<void>

// Records a resend only when the last one is older than the limit. Returns whether it did.
export type ClaimVerificationResendPort = (userId: string, now: Date) => Promise<boolean>

// Counts one more attempt in the hour window of the network. Returns the count in the window.
export type IncrementNetworkAttemptsPort = (networkHash: string, now: Date) => Promise<number>

export type SendVerificationEmailPort = (input: { to: string; language: Language; token: string }) => Promise<void>
export type SendSignupAttemptEmailPort = (input: { to: string; language: Language; userType: UserType }) => Promise<void>
