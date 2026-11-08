import { normalizeEmail, toUserType } from '../domain/models/user-model.js'
import { hashPassword } from '../infra/adapters/hash-password-adapter.js'
import { ClubModel } from '../infra/schemas/clubs-schema.js'
import { EmailVerificationTokenModel } from '../infra/schemas/email-verification-tokens-schema.js'
import { PasswordResetTokenModel } from '../infra/schemas/password-reset-tokens-schema.js'
import { OAuthStateModel } from '../infra/schemas/oauth-states-schema.js'
import { RegistrationAttemptModel } from '../infra/schemas/registration-attempts-schema.js'
import { SocialLinkAttemptModel } from '../infra/schemas/social-link-attempts-schema.js'
import { SocialLinkRequestModel } from '../infra/schemas/social-link-requests-schema.js'
import { SocialLoginCodeModel } from '../infra/schemas/social-login-codes-schema.js'
import { UserModel } from '../infra/schemas/users-schema.js'

export type SeedResult = 'created' | 'exists' | 'skipped'

export async function createIndexes(): Promise<void> {
  await Promise.all(
    [
      UserModel,
      ClubModel,
      PasswordResetTokenModel,
      EmailVerificationTokenModel,
      RegistrationAttemptModel,
      OAuthStateModel,
      SocialLoginCodeModel,
      SocialLinkRequestModel,
      SocialLinkAttemptModel,
    ].map((model) => model.createIndexes()),
  )
}

// Administrators existed before email confirmation, so they count as confirmed since their creation.
export async function markAdministratorsVerified(): Promise<void> {
  await UserModel.updateMany(
    { type: 'ADMIN', emailVerifiedAt: null },
    [{ $set: { emailVerifiedAt: { $ifNull: ['$createdAt', '$$NOW'] } } }],
    { updatePipeline: true },
  )
}

// Creates the initial account, already confirmed. It does nothing without the variables, as in published
// environments. SEED_USER_TYPE=CLIENT creates a client instead, for the client E2E tests.
export async function runSeed(env: NodeJS.ProcessEnv): Promise<SeedResult> {
  await createIndexes()
  await markAdministratorsVerified()

  const { SEED_ADMIN_EMAIL: rawEmail, SEED_ADMIN_PASSWORD: password, SEED_USER_TYPE: rawType } = env
  if (!rawEmail || !password) return 'skipped'

  const type = toUserType(rawType || 'ADMIN')
  const email = normalizeEmail(rawEmail)
  if (await UserModel.exists({ email })) return 'exists'

  await UserModel.create({
    name: type === 'ADMIN' ? 'Admin' : 'Client',
    email,
    passwordHash: await hashPassword(password),
    type,
    emailVerifiedAt: new Date(),
  })
  return 'created'
}
