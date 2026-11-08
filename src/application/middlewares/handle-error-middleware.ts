import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import {
  EmailNotVerifiedError,
  EmailRequiredError,
  InvalidCredentialsError,
  InvalidResetLinkError,
  InvalidSocialCodeError,
  InvalidSocialLinkError,
  InvalidStateError,
  InvalidTokenError,
  InvalidVerificationLinkError,
  NotFoundError,
  ProviderUnavailableError,
  SocialLoginCancelledError,
  TooManyRequestsError,
  WeakPasswordError,
} from '../../domain/models/auth-errors-model.js'

const toResponse = (error: Error): { status: number; code: string } => {
  if (error instanceof InvalidCredentialsError) return { status: 401, code: 'invalid_credentials' }
  if (error instanceof InvalidTokenError) return { status: 401, code: 'invalid_token' }
  if (error instanceof InvalidResetLinkError) return { status: 400, code: 'invalid_reset_link' }
  if (error instanceof WeakPasswordError) return { status: 400, code: 'weak_password' }
  if (error instanceof NotFoundError) return { status: 404, code: 'not_found' }
  if (error instanceof EmailNotVerifiedError) return { status: 403, code: 'email_not_verified' }
  if (error instanceof InvalidVerificationLinkError) return { status: 400, code: 'invalid_verification_link' }
  if (error instanceof TooManyRequestsError) return { status: 429, code: 'too_many_requests' }
  if (error instanceof InvalidStateError) return { status: 400, code: 'invalid_state' }
  if (error instanceof SocialLoginCancelledError) return { status: 400, code: 'cancelled' }
  if (error instanceof EmailRequiredError) return { status: 400, code: 'email_required' }
  if (error instanceof ProviderUnavailableError) {
    return { status: error.configured ? 502 : 503, code: 'provider_unavailable' }
  }
  if (error instanceof InvalidSocialCodeError) return { status: 401, code: 'invalid_social_code' }
  if (error instanceof InvalidSocialLinkError) return { status: 400, code: 'invalid_social_link' }
  if (error instanceof SyntaxError) return { status: 400, code: 'invalid_request' }
  return { status: 500, code: 'internal_error' }
}

export const handleError: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({ error: 'invalid_request' })
    return
  }
  const known = error instanceof Error
  const { status, code } = known ? toResponse(error) : { status: 500, code: 'internal_error' }
  // Only the error name: messages and bodies could carry passwords or tokens.
  if (status === 500) console.error(`Request failed: ${known ? error.name : 'unexpected value'}`)
  response.status(status).json({ error: code })
}
