import type { NextFunction, Request, Response } from 'express'
import { InvalidTokenError } from '../../domain/models/auth-errors-model.js'
import type { TokenClaims } from '../../domain/models/session-model.js'
import type { VerifyTokenPort } from '../../domain/ports/auth-output-ports.js'

export type AuthenticatedResponse = Response<object, { claims: TokenClaims }>

export function createRequireAuth(verifyToken: VerifyTokenPort) {
  return (request: Request, response: AuthenticatedResponse, next: NextFunction): void => {
    const [scheme, token] = (request.headers.authorization ?? '').split(' ')
    if (scheme !== 'Bearer' || !token) throw new InvalidTokenError()
    response.locals.claims = verifyToken(token)
    next()
  }
}

export type RequireAuth = ReturnType<typeof createRequireAuth>
