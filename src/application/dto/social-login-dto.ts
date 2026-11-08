import { z } from 'zod'
import { loginResponseDto } from './auth-dto.js'

const value = z.string().min(1).max(512)

export const authorizationRequestDto = z.strictObject({
  binding: value,
  language: z.enum(['pt-BR', 'en']).optional(),
})

export const authorizationResponseDto = z.object({ url: z.string() })

export const callbackRequestDto = z.strictObject({
  binding: value,
  state: value,
  code: z.string().min(1).max(2048).optional(),
  error: z.string().min(1).max(256).optional(),
  ip: z.string().max(64).optional(),
  userAgent: z.string().max(1024).optional(),
})

export const socialSessionRequestDto = z.strictObject({ code: value })

export const socialSessionResponseDto = loginResponseDto

export const socialLinkRequestDto = z.strictObject({ token: z.string().min(1).max(256) })

export const socialLinkPreviewResponseDto = z.object({
  provider: z.enum(['google', 'facebook']),
  profileName: z.string(),
  email: z.string(),
})
