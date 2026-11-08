import { z } from 'zod'
import { MAXIMUM_NAME_LENGTH } from '../../domain/models/user-model.js'

const email = z.string().trim().email().max(254)
const language = z.enum(['pt-BR', 'en'])

// Strict and without a type field: an account created here is always a client (spec FR-008).
export const registerRequestDto = z.strictObject({
  name: z.string().trim().min(1).max(MAXIMUM_NAME_LENGTH),
  email,
  password: z.string().min(1).max(256),
  language: language.optional(),
  ip: z.string().max(64).optional(),
})

export const verifyEmailRequestDto = z.strictObject({ token: z.string().min(1).max(256) })

export const resendVerificationRequestDto = z.strictObject({ email, language: language.optional() })
