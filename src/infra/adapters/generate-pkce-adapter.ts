import { createHash, randomBytes } from 'node:crypto'
import type { GeneratePkcePort } from '../../domain/ports/social-login-output-ports.js'

// RFC 7636: a 43 character verifier and its S256 challenge.
export const generatePkce: GeneratePkcePort = () => {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}
