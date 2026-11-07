import { hash } from '@node-rs/argon2'
import type { HashPasswordPort } from '../../domain/ports/auth-output-ports.js'

export const hashPassword: HashPasswordPort = (password) => hash(password)
