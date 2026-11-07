import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import type { SignTokenPort } from '../../domain/ports/auth-output-ports.js'

export function createSignToken(secret: string): SignTokenPort {
  return (claims, now, expiresAt) =>
    jwt.sign(
      {
        sub: claims.userId,
        name: claims.name,
        email: claims.email,
        type: claims.type,
        clubIds: claims.clubIds,
        tokenVersion: claims.tokenVersion,
        sid: claims.sessionId,
        sessionStartedAt: claims.sessionStartedAt.getTime(),
        // A random id makes every token different, even for the same user in the same second.
        jti: randomUUID(),
        iat: Math.floor(now.getTime() / 1000),
        exp: Math.floor(expiresAt.getTime() / 1000),
      },
      secret,
      { algorithm: 'HS256' },
    )
}
