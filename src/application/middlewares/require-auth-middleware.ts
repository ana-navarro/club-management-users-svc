import type { NextFunction, Request, Response } from 'express'
import { InvalidTokenError } from '../../domain/models/auth-errors-model.js'
import type { TokenClaims } from '../../domain/models/session-model.js'
import type { VerifyTokenPort } from '../../domain/ports/auth-output-ports.js'
import type { AppTypeLocals } from './require-app-type-middleware.js'

export type AuthenticatedResponse = Response<object, AppTypeLocals & { claims: TokenClaims }>

export function createRequireAuth(verifyToken: VerifyTokenPort) {
  return (request: Request, response: AuthenticatedResponse, next: NextFunction): void => {
    const [scheme, token] = (request.headers.authorization ?? '').split(' ')
    if (scheme !== 'Bearer' || !token) throw new InvalidTokenError()
    const claims = verifyToken(token)
    // Both systems share the signing key, so a token only works in the system of its type (research R11).
    if (claims.type !== response.locals.appType) throw new InvalidTokenError()
    response.locals.claims = claims
    next()
  }
}

export type RequireAuth = ReturnType<typeof createRequireAuth>
