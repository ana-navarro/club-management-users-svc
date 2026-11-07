import { verify } from '@node-rs/argon2'
import type { VerifyPasswordPort } from '../../domain/ports/auth-output-ports.js'

export const verifyPassword: VerifyPasswordPort = (hash, password) => verify(hash, password)
