import type { ProviderIdentity, SocialIdentity, SocialProvider } from '../models/social-identity-model.js'
import type { Language, User } from '../models/user-model.js'

export type { ProviderIdentity }

export type GenerateRandomValuePort = () => string
export type GeneratePkcePort = () => { verifier: string; challenge: string }

export type BuildAuthorizationUrlPort = (input: { state: string; challenge: string; nonce: string }) => string
// Exchanges the code and validates the identity. Any failure is a ProviderUnavailableError.
export type FetchProviderIdentityPort = (input: { code: string; verifier: string; nonce: string | null }) => Promise<ProviderIdentity>

export type SocialProviderPorts = {
  buildAuthorizationUrl: BuildAuthorizationUrlPort
  fetchIdentity: FetchProviderIdentityPort
}

// null when the provider has no credentials here.
export type SocialProvidersPorts = Record<SocialProvider, SocialProviderPorts | null>

export type OAuthState = { codeVerifier: string; nonce: string | null; language: Language | null }

export type CreateOAuthStatePort = (
  input: OAuthState & { stateHash: string; bindingHash: string; provider: SocialProvider; expiresAt: Date },
) => Promise<void>

// Marks the attempt as used only if the state, the browser binding, the provider and the validity match.
export type ConsumeOAuthStatePort = (input: {
  stateHash: string
  bindingHash: string
  provider: SocialProvider
  now: Date
}) => Promise<OAuthState | null>

export type FindUserBySocialIdentityPort = (provider: SocialProvider, subject: string) => Promise<User | null>

// Adds the identity only when the user has none of that provider. Returns whether it did.
export type LinkSocialIdentityPort = (userId: string, identity: SocialIdentity) => Promise<boolean>
// Replaces the identity of that provider. Returns false when another user already has the new one.
export type ReplaceSocialIdentityPort = (userId: string, identity: SocialIdentity) => Promise<boolean>

// Research R7: confirms the email, drops the password and ends the sessions, only while unconfirmed.
export type ClaimUnverifiedAccountPort = (userId: string, now: Date) => Promise<boolean>

// A confirmed client without a password. Returns null when the email already has an account.
export type CreateSocialClientUserPort = (input: {
  name: string
  email: string
  identity: SocialIdentity
  language: Language | null
  now: Date
}) => Promise<User | null>

export type CreateSocialLoginCodePort = (input: { codeHash: string; userId: string; expiresAt: Date }) => Promise<void>
export type ConsumeSocialLoginCodePort = (codeHash: string, now: Date) => Promise<string | null>

export type SocialLinkRequest = {
  id: string
  provider: SocialProvider
  subject: string
  email: string
  profileName: string
  language: Language | null
}

export type CountRecentSocialLinkRequestsPort = (email: string, since: Date) => Promise<number>
// Stores the request and marks the unused ones of the same identity as used.
export type CreateSocialLinkRequestPort = (
  input: Omit<SocialLinkRequest, 'id'> & { tokenHash: string; expiresAt: Date; now: Date },
) => Promise<void>
export type FindSocialLinkRequestPort = (tokenHash: string, now: Date) => Promise<SocialLinkRequest | null>
// Atomic: only one of simultaneous confirmations or declines gets the request.
export type ConsumeSocialLinkRequestPort = (tokenHash: string, now: Date) => Promise<SocialLinkRequest | null>

export type SendSocialLinkEmailPort = (input: {
  to: string
  language: Language
  token: string
  profileName: string
}) => Promise<void>
