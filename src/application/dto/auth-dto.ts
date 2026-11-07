import { z } from 'zod'

const email = z.string().trim().email().max(254)
const language = z.enum(['pt-BR', 'en'])
const theme = z.enum(['light', 'dark'])

export const loginRequestDto = z.strictObject({
  email,
  password: z.string().min(1).max(256),
  userType: z.enum(['ADMIN', 'CLIENT']),
  ip: z.string().max(64).optional(),
  userAgent: z.string().max(1024).optional(),
  language: language.optional(),
})

export const forgotPasswordRequestDto = z.strictObject({ email, language: language.optional() })

export const resetPasswordRequestDto = z.strictObject({
  token: z.string().min(1).max(256),
  password: z.string().min(1).max(256),
})

export const updatePreferencesRequestDto = z
  .strictObject({ theme: theme.optional(), language: language.optional() })
  .refine((value) => value.theme !== undefined || value.language !== undefined)

export const publicUserResponseDto = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  type: z.enum(['ADMIN', 'CLIENT']),
  clubs: z.array(z.object({ id: z.string(), name: z.string() })),
  preferences: z.object({ theme: theme.nullable(), language: language.nullable() }),
})

export const sessionResponseDto = z.object({
  token: z.string(),
  expiresAt: z.date().transform((date) => date.toISOString()),
  renewAt: z.date().transform((date) => date.toISOString()),
})

export const loginResponseDto = sessionResponseDto.extend({ user: publicUserResponseDto })
