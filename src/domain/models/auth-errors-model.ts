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
