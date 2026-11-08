import { randomBytes } from 'node:crypto'
import type { GenerateRandomValuePort } from '../../domain/ports/social-login-output-ports.js'

export const generateNonce: GenerateRandomValuePort = () => randomBytes(24).toString('base64url')
