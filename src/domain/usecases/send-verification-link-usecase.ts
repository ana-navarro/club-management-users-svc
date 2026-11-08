import { EMAIL_VERIFICATION_LINK_HOURS, type Language, type User } from '../models/user-model.js'
import type { GenerateResetTokenPort } from '../ports/auth-output-ports.js'
import type { CreateEmailVerificationTokenPort, SendVerificationEmailPort } from '../ports/registration-output-ports.js'

export type SendVerificationLinkDependencies = {
  generateToken: GenerateResetTokenPort
  createEmailVerificationToken: CreateEmailVerificationTokenPort
  sendVerificationEmail: SendVerificationEmailPort
}

// Shared by the sign-up and the resend: a new 24 hour link replaces the pending ones.
export async function sendVerificationLink(
  deps: SendVerificationLinkDependencies,
  user: User,
  language: Language,
  now: Date,
): Promise<void> {
  const { token, tokenHash } = deps.generateToken()
  await deps.createEmailVerificationToken({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_LINK_HOURS * 60 * 60 * 1000),
    now,
  })
  await deps.sendVerificationEmail({ to: user.email, language, token })
}
