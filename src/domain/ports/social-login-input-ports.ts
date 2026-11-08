import type { SocialProvider } from '../models/social-identity-model.js'
import type { Language } from '../models/user-model.js'
import type { LoginOutput } from './auth-input-ports.js'

export type StartSocialLoginInput = { provider: SocialProvider; binding: string; language?: Language }

export type CompleteSocialLoginInput = {
  provider: SocialProvider
  binding: string
  state: string
  code?: string
  error?: string
  ip?: string
  userAgent?: string
}

// A session code, or the first Facebook entry waiting for the email confirmation (spec FR-014c).
export type CompleteSocialLoginOutput = { status: 'session'; code: string } | { status: 'pending' }

export type SocialLinkPreview = { provider: SocialProvider; profileName: string; email: string }

export interface StartSocialLoginInputPort {
  execute(input: StartSocialLoginInput): Promise<{ url: string }>
}

export interface CompleteSocialLoginInputPort {
  execute(input: CompleteSocialLoginInput): Promise<CompleteSocialLoginOutput>
}

export interface ExchangeSocialCodeInputPort {
  execute(input: { code: string }): Promise<LoginOutput>
}

export interface PreviewSocialLinkInputPort {
  execute(input: { token: string }): Promise<SocialLinkPreview>
}

export interface ConfirmSocialLinkInputPort {
  execute(input: { token: string }): Promise<void>
}

export interface DeclineSocialLinkInputPort {
  execute(input: { token: string }): Promise<void>
}
