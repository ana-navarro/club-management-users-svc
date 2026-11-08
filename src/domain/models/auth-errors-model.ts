export class InvalidCredentialsError extends Error {
  override name = 'InvalidCredentialsError'
}

export class InvalidTokenError extends Error {
  override name = 'InvalidTokenError'
}

export class InvalidResetLinkError extends Error {
  override name = 'InvalidResetLinkError'
}

export class WeakPasswordError extends Error {
  override name = 'WeakPasswordError'
}

// The route exists only for the other system.
export class NotFoundError extends Error {
  override name = 'NotFoundError'
}

// Only after the right password, so it reveals the state only to whoever knows it (research R8).
export class EmailNotVerifiedError extends Error {
  override name = 'EmailNotVerifiedError'
}

export class InvalidVerificationLinkError extends Error {
  override name = 'InvalidVerificationLinkError'
}

export class TooManyRequestsError extends Error {
  override name = 'TooManyRequestsError'
}

export class InvalidStateError extends Error {
  override name = 'InvalidStateError'
}

export class SocialLoginCancelledError extends Error {
  override name = 'SocialLoginCancelledError'
}

export class EmailRequiredError extends Error {
  override name = 'EmailRequiredError'
}

export class ProviderUnavailableError extends Error {
  override name = 'ProviderUnavailableError'
  // 503 when the provider has no credentials here, 502 when it failed.
  readonly configured: boolean

  constructor(configured = true) {
    super()
    this.configured = configured
  }
}

export class InvalidSocialCodeError extends Error {
  override name = 'InvalidSocialCodeError'
}

export class InvalidSocialLinkError extends Error {
  override name = 'InvalidSocialLinkError'
}
