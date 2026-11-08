import { TooManyRequestsError, WeakPasswordError } from '../models/auth-errors-model.js'
import {
  MAXIMUM_REGISTRATIONS_PER_HOUR,
  MINIMUM_PASSWORD_LENGTH,
  getNetworkPrefix,
  normalizeEmail,
  resolveLanguage,
  type Language,
} from '../models/user-model.js'
import type {
  FindUserByEmailPort,
  HashNetworkPort,
  HashPasswordPort,
  NowPort,
  RunInBackgroundPort,
} from '../ports/auth-output-ports.js'
import type { RegisterClientInputPort, RegisterInput } from '../ports/registration-input-ports.js'
import type {
  ClaimVerificationResendPort,
  CreateClientUserPort,
  IncrementNetworkAttemptsPort,
  SendSignupAttemptEmailPort,
} from '../ports/registration-output-ports.js'
import { sendVerificationLink, type SendVerificationLinkDependencies } from './send-verification-link-usecase.js'

export type RegisterClientDependencies = SendVerificationLinkDependencies & {
  incrementRegistrationAttempts: IncrementNetworkAttemptsPort
  hashNetwork: HashNetworkPort
  hashPassword: HashPasswordPort
  createClientUser: CreateClientUserPort
  findUserByEmail: FindUserByEmailPort
  claimVerificationResend: ClaimVerificationResendPort
  sendSignupAttemptEmail: SendSignupAttemptEmailPort
  runInBackground: RunInBackgroundPort
  now: NowPort
}

export class RegisterClientUsecase implements RegisterClientInputPort {
  private readonly deps: RegisterClientDependencies

  constructor(deps: RegisterClientDependencies) {
    this.deps = deps
  }

  async execute(input: RegisterInput): Promise<void> {
    const { deps } = this
    const now = deps.now()

    // Sign-ups without an address only happen outside the gateway, so they are not limited.
    const prefix = getNetworkPrefix(input.ip)
    if (prefix) {
      const attempts = await deps.incrementRegistrationAttempts(deps.hashNetwork(prefix), now)
      if (attempts > MAXIMUM_REGISTRATIONS_PER_HOUR) throw new TooManyRequestsError()
    }

    if (input.password.length < MINIMUM_PASSWORD_LENGTH) throw new WeakPasswordError()

    // Always computed, so the time does not reveal whether the account exists.
    const passwordHash = await deps.hashPassword(input.password)
    const email = normalizeEmail(input.email)
    const created = await deps.createClientUser({
      name: input.name.trim(),
      email,
      passwordHash,
      language: input.language ?? null,
    })

    // Emails go in the background, so every case answers the same way and at the same pace.
    deps.runInBackground(async () => {
      if (created) {
        await sendVerificationLink(deps, created, resolveLanguage(created.language, input.language), now)
        return
      }
      await this.warnExistingAccount(email, input.language, now)
    })
  }

  private async warnExistingAccount(email: string, requested: Language | undefined, now: Date): Promise<void> {
    const { deps } = this
    const existing = await deps.findUserByEmail(email)
    if (!existing) return

    const language = resolveLanguage(existing.language, requested)
    if (existing.type === 'CLIENT' && existing.emailVerifiedAt === null) {
      if (await deps.claimVerificationResend(existing.id, now)) {
        await sendVerificationLink(deps, existing, language, now)
      }
      return
    }
    await deps.sendSignupAttemptEmail({ to: existing.email, language, userType: existing.type })
  }
}
