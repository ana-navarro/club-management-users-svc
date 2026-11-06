import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { InvalidTokenError } from '../../domain/models/auth-errors-model.js'
import type { TokenClaims } from '../../domain/models/session-model.js'
import type { VerifyTokenPort } from '../../domain/ports/auth-output-ports.js'

const tokenPayloadSchema = z.object({
  sub: z.string(),
  name: z.string(),
  email: z.string(),
  type: z.enum(['ADMIN', 'CLIENT']),
  clubIds: z.array(z.string()),
  tokenVersion: z.number(),
  sid: z.string(),
  sessionStartedAt: z.number(),
})

export function createVerifyToken(secret: string): VerifyTokenPort {
  return (token): TokenClaims => {
    try {
      const payload = tokenPayloadSchema.parse(jwt.verify(token, secret, { algorithms: ['HS256'] }))
      return {
        userId: payload.sub,
        name: payload.name,
        email: payload.email,
        type: payload.type,
        clubIds: payload.clubIds,
        tokenVersion: payload.tokenVersion,
        sessionId: payload.sid,
        sessionStartedAt: new Date(payload.sessionStartedAt),
      }
    } catch {
      throw new InvalidTokenError()
    }
  }
}
