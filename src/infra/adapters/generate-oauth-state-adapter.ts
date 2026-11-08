import { randomBytes } from 'node:crypto'
import type { GenerateRandomValuePort } from '../../domain/ports/social-login-output-ports.js'

export const generateOAuthState: GenerateRandomValuePort = () => randomBytes(32).toString('base64url')
