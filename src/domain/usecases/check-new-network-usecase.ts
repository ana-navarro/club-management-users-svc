import { PASSWORD_RESET_LINK_HOURS, getNetworkPrefix, resolveLanguage, type Language, type User } from '../models/user-model.js'
import type {
  AddKnownNetworkPort,
  CreatePasswordResetTokenPort,
  GenerateResetTokenPort,
  HashNetworkPort,
  RunInBackgroundPort,
  SendNewLocationEmailPort,
} from '../ports/auth-output-ports.js'

export type ResetLinkDependencies = {
  generateResetToken: GenerateResetTokenPort
  createPasswordResetToken: CreatePasswordResetTokenPort
}

export type CheckNewNetworkDependencies = ResetLinkDependencies & {
  hashNetwork: HashNetworkPort
  addKnownNetwork: AddKnownNetworkPort
  sendNewLocationEmail: SendNewLocationEmailPort
  runInBackground: RunInBackgroundPort
}

export type ClientDetails = { ip?: string; userAgent?: string; language?: Language }

export async function createResetLinkToken(deps: ResetLinkDependencies, user: User, now: Date): Promise<string> {
  const { token, tokenHash } = deps.generateResetToken()
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_LINK_HOURS * 60 * 60 * 1000)
  await deps.createPasswordResetToken({ userId: user.id, tokenHash, expiresAt })
  return token
}

// Shared by the password and the social logins: a sign-in from an unknown network warns the account,
// with a link to change the password. The first network of an account is simply remembered.
export async function checkNewNetwork(
  deps: CheckNewNetworkDependencies,
  user: User,
  client: ClientDetails,
  now: Date,
): Promise<void> {
  const prefix = getNetworkPrefix(client.ip)
  if (!prefix) return

  const networkHash = deps.hashNetwork(prefix)
  if (user.knownNetworks.includes(networkHash)) return

  await deps.addKnownNetwork(user.id, networkHash)
  if (user.knownNetworks.length === 0) return

  deps.runInBackground(async () => {
    const token = await createResetLinkToken(deps, user, now)
    await deps.sendNewLocationEmail({
      to: user.email,
      userType: user.type,
      language: resolveLanguage(user.language, client.language),
      token,
      when: now,
      userAgent: client.userAgent,
    })
  })
}
