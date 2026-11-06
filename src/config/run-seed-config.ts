import { normalizeEmail } from '../domain/models/user-model.js'
import { hashPassword } from '../infra/adapters/hash-password-adapter.js'
import { ClubModel } from '../infra/schemas/clubs-schema.js'
import { PasswordResetTokenModel } from '../infra/schemas/password-reset-tokens-schema.js'
import { UserModel } from '../infra/schemas/users-schema.js'

export type SeedResult = 'created' | 'exists' | 'skipped'

export async function createIndexes(): Promise<void> {
  await Promise.all([UserModel.createIndexes(), ClubModel.createIndexes(), PasswordResetTokenModel.createIndexes()])
}

// Creates the initial administrator. It does nothing without the variables, as in published environments.
export async function runSeed(env: NodeJS.ProcessEnv): Promise<SeedResult> {
  await createIndexes()

  const { SEED_ADMIN_EMAIL: rawEmail, SEED_ADMIN_PASSWORD: password } = env
  if (!rawEmail || !password) return 'skipped'

  const email = normalizeEmail(rawEmail)
  if (await UserModel.exists({ email })) return 'exists'

  await UserModel.create({
    name: 'Admin',
    email,
    passwordHash: await hashPassword(password),
    type: 'ADMIN',
  })
  return 'created'
}
