import { InvalidCredentialsError } from '../models/auth-errors-model.js'
import type { SocialIdentity } from '../models/social-identity-model.js'
import type { Language, User } from '../models/user-model.js'
import type { FindUserByEmailPort, FindUserByIdPort, InvalidatePasswordResetTokensPort } from '../ports/auth-output-ports.js'
import type { InvalidateEmailVerificationTokensPort } from '../ports/registration-output-ports.js'
import type {
  ClaimUnverifiedAccountPort,
  CreateSocialClientUserPort,
  LinkSocialIdentityPort,
  ReplaceSocialIdentityPort,
} from '../ports/social-login-output-ports.js'

export type LinkSocialAccountDependencies = {
  findUserByEmail: FindUserByEmailPort
  findUserById: FindUserByIdPort
  linkSocialIdentity: LinkSocialIdentityPort
  replaceSocialIdentity: ReplaceSocialIdentityPort
  claimUnverifiedAccount: ClaimUnverifiedAccountPort
  invalidateEmailVerificationTokens: InvalidateEmailVerificationTokensPort
  invalidatePasswordResetTokens: InvalidatePasswordResetTokensPort
  createSocialClientUser: CreateSocialClientUserPort
}

export type LinkSocialAccountInput = {
  identity: SocialIdentity
  email: string
  name: string
  language: Language | null
  // The Facebook confirmation replaces another Facebook profile already linked (research R5a).
  replace: boolean
}

// Research R6: the email has a single account. A client account gets the identity, an unconfirmed one
// is claimed (R7), and without an account a confirmed client is created. An administrator is refused.
export async function linkSocialAccount(
  deps: LinkSocialAccountDependencies,
  input: LinkSocialAccountInput,
  now: Date,
): Promise<User> {
  const existing = await deps.findUserByEmail(input.email)
  if (!existing) {
    const created = await deps.createSocialClientUser({
      name: input.name,
      email: input.email,
      identity: input.identity,
      language: input.language,
      now,
    })
    if (created) return created
    // A simultaneous sign-up or entry created the account first: link to it instead.
    const winner = await deps.findUserByEmail(input.email)
    if (!winner) throw new InvalidCredentialsError()
    return attach(deps, winner, input, now)
  }
  return attach(deps, existing, input, now)
}

async function attach(
  deps: LinkSocialAccountDependencies,
  user: User,
  input: LinkSocialAccountInput,
  now: Date,
): Promise<User> {
  if (user.type !== 'CLIENT') throw new InvalidCredentialsError()

  const current = user.socialIdentities.find((identity) => identity.provider === input.identity.provider)
  if (!current) {
    await deps.linkSocialIdentity(user.id, input.identity)
  } else if (input.replace && current.subject !== input.identity.subject) {
    await deps.replaceSocialIdentity(user.id, input.identity)
  }

  if (user.emailVerifiedAt === null && (await deps.claimUnverifiedAccount(user.id, now))) {
    // Links sent before the claim belong to whoever signed up with the email, so none stay valid.
    await deps.invalidateEmailVerificationTokens(user.id, now)
    await deps.invalidatePasswordResetTokens(user.id, now)
  }

  const updated = await deps.findUserById(user.id)
  if (!updated) throw new InvalidCredentialsError()
  return updated
}
