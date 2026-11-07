import { createHash, randomBytes } from 'node:crypto'
import type { GenerateResetTokenPort, HashResetTokenPort } from '../../domain/ports/auth-output-ports.js'

export const hashResetToken: HashResetTokenPort = (token) => createHash('sha256').update(token).digest('hex')

export const generateResetToken: GenerateResetTokenPort = () => {
  const token = randomBytes(32).toString('base64url')
  return { token, tokenHash: hashResetToken(token) }
}
