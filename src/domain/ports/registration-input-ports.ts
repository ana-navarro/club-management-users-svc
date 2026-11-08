import type { Language } from '../models/user-model.js'

export type RegisterInput = { name: string; email: string; password: string; language?: Language; ip?: string }

export interface RegisterClientInputPort {
  // Resolves the same way whether or not the email has an account (spec FR-009).
  execute(input: RegisterInput): Promise<void>
}

export interface VerifyEmailInputPort {
  execute(input: { token: string }): Promise<void>
}

export interface ResendVerificationInputPort {
  execute(input: { email: string; language?: Language }): void
}
