import { InvalidTokenError } from './auth-errors-model.js'
import type { User, UserType } from './user-model.js'

const HOUR = 60 * 60 * 1000

export const SESSION_IDLE_MS = 2 * HOUR
export const SESSION_MAXIMUM_MS = 12 * HOUR
export const SESSION_RENEW_BEFORE_MS = HOUR / 2

export type TokenClaims = {
  userId: string
  name: string
  email: string
  type: UserType
  clubIds: string[]
  tokenVersion: number
  sessionId: string
  sessionStartedAt: Date
}

export type Session = { token: string; expiresAt: Date; renewAt: Date }

export function getSessionTimes(now: Date, sessionStartedAt: Date): { expiresAt: Date; renewAt: Date } {
  const limit = sessionStartedAt.getTime() + SESSION_MAXIMUM_MS
  const idle = now.getTime() + SESSION_IDLE_MS
  const expiresAt = new Date(Math.min(idle, limit))
  // At the limit, a renewal would gain nothing, so the session simply ends.
  const renewAt = idle >= limit ? expiresAt : new Date(expiresAt.getTime() - SESSION_RENEW_BEFORE_MS)
  return { expiresAt, renewAt }
}

export function toTokenClaims(user: User, sessionId: string, sessionStartedAt: Date): TokenClaims {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    type: user.type,
    clubIds: user.clubs.map((club) => club.id),
    tokenVersion: user.tokenVersion,
    sessionId,
    sessionStartedAt,
  }
}

export function assertActiveSession(user: User | null, claims: TokenClaims): asserts user is User {
  if (!user || user.tokenVersion !== claims.tokenVersion) throw new InvalidTokenError()
}
