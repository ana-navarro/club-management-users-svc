export type SocialProvider = 'google' | 'facebook'

export type SocialIdentity = { provider: SocialProvider; subject: string; linkedAt: Date }

// Returns null for any other value, so a route can answer 404 for an unknown provider.
export function toSocialProvider(value: string | null | undefined): SocialProvider | null {
  return value === 'google' || value === 'facebook' ? value : null
}

// The identity a provider confirmed. Facebook does not say whether the email is verified,
// so emailVerified is always false for it (research R5).
export type ProviderIdentity = {
  provider: SocialProvider
  subject: string
  email: string | null
  emailVerified: boolean
  name: string
}

export const OAUTH_STATE_MINUTES = 10
export const SOCIAL_LOGIN_CODE_SECONDS = 60
export const SOCIAL_LINK_HOURS = 24
export const SOCIAL_LINK_RESEND_SECONDS = 60
export const MAXIMUM_SOCIAL_LINK_EMAILS_PER_DAY = 5
export const MAXIMUM_SOCIAL_LINK_REQUESTS_PER_HOUR = 10
export const MAXIMUM_PROFILE_NAME_LENGTH = 100
