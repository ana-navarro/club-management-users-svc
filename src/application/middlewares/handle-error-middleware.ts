import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import {
  InvalidCredentialsError,
  InvalidResetLinkError,
  InvalidTokenError,
  WeakPasswordError,
} from '../../domain/models/auth-errors-model.js'

const toResponse = (error: Error): { status: number; code: string } => {
  if (error instanceof InvalidCredentialsError) return { status: 401, code: 'invalid_credentials' }
  if (error instanceof InvalidTokenError) return { status: 401, code: 'invalid_token' }
  if (error instanceof InvalidResetLinkError) return { status: 400, code: 'invalid_reset_link' }
  if (error instanceof WeakPasswordError) return { status: 400, code: 'weak_password' }
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
