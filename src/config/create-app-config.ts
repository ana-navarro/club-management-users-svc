import express, { type Express } from 'express'
import nodemailer from 'nodemailer'
import { AuthController, type AuthControllerDependencies } from '../application/controllers/auth-controller.js'
import { GetHealthController } from '../application/controllers/get-health-controller.js'
import {
  RegistrationController,
  type RegistrationControllerDependencies,
} from '../application/controllers/registration-controller.js'
import { UserController, type UserControllerDependencies } from '../application/controllers/user-controller.js'
import { handleError } from '../application/middlewares/handle-error-middleware.js'
import { requireAppType } from '../application/middlewares/require-app-type-middleware.js'
import { createRequireAuth } from '../application/middlewares/require-auth-middleware.js'
import { createAuthRoute } from '../application/routes/auth-route.js'
import { createGetHealthRoute } from '../application/routes/get-health-route.js'
import { createRegistrationRoute } from '../application/routes/registration-route.js'
import { createUserRoute } from '../application/routes/user-route.js'
import type { RunInBackgroundPort, VerifyTokenPort } from '../domain/ports/auth-output-ports.js'
import { GetCurrentUserUsecase } from '../domain/usecases/get-current-user-usecase.js'
import { GetHealthUsecase } from '../domain/usecases/get-health-usecase.js'
import { LoginUserUsecase } from '../domain/usecases/login-user-usecase.js'
import { RegisterClientUsecase } from '../domain/usecases/register-client-usecase.js'
import { ResendVerificationUsecase } from '../domain/usecases/resend-verification-usecase.js'
import { VerifyEmailUsecase } from '../domain/usecases/verify-email-usecase.js'
import { RefreshTokenUsecase } from '../domain/usecases/refresh-token-usecase.js'
import { RequestPasswordResetUsecase } from '../domain/usecases/request-password-reset-usecase.js'
import { ResetPasswordUsecase } from '../domain/usecases/reset-password-usecase.js'
import { UpdateUserPreferencesUsecase } from '../domain/usecases/update-user-preferences-usecase.js'
import { addKnownNetwork } from '../infra/adapters/add-known-network-adapter.js'
import { claimVerificationResend } from '../infra/adapters/claim-verification-resend-adapter.js'
import { consumeEmailVerificationToken } from '../infra/adapters/consume-email-verification-token-adapter.js'
import { createClientUser } from '../infra/adapters/create-client-user-adapter.js'
import { createEmailVerificationToken } from '../infra/adapters/create-email-verification-token-adapter.js'
import { incrementRegistrationAttempts } from '../infra/adapters/increment-registration-attempts-adapter.js'
import { invalidateEmailVerificationTokens } from '../infra/adapters/invalidate-email-verification-tokens-adapter.js'
import { markEmailVerified } from '../infra/adapters/mark-email-verified-adapter.js'
import { createSendSignupAttemptEmail } from '../infra/adapters/send-signup-attempt-email-adapter.js'
import { createSendVerificationEmail } from '../infra/adapters/send-verification-email-adapter.js'
import { clearFailedLogins } from '../infra/adapters/clear-failed-logins-adapter.js'
import { createPasswordResetToken } from '../infra/adapters/create-password-reset-token-adapter.js'
import { findPasswordResetToken } from '../infra/adapters/find-password-reset-token-adapter.js'
import { findUserByEmail } from '../infra/adapters/find-user-by-email-adapter.js'
import { findUserById } from '../infra/adapters/find-user-by-id-adapter.js'
import { generateResetToken, hashResetToken } from '../infra/adapters/generate-reset-token-adapter.js'
import { createHashNetwork } from '../infra/adapters/hash-network-adapter.js'
import { hashPassword } from '../infra/adapters/hash-password-adapter.js'
import { incrementPasswordResetRequests } from '../infra/adapters/increment-password-reset-requests-adapter.js'
import { invalidatePasswordResetTokens } from '../infra/adapters/invalidate-password-reset-tokens-adapter.js'
import { markPasswordResetTokenUsed } from '../infra/adapters/mark-password-reset-token-used-adapter.js'
import { recordFailedLogin } from '../infra/adapters/record-failed-login-adapter.js'
import { createSendLoginAttemptsEmail } from '../infra/adapters/send-login-attempts-email-adapter.js'
import { createSendNewLocationEmail } from '../infra/adapters/send-new-location-email-adapter.js'
import type { AppUrls, EmailTransport } from '../infra/adapters/create-email-link-adapter.js'
import { createSendPasswordResetEmail } from '../infra/adapters/send-password-reset-email-adapter.js'
import { createSignToken } from '../infra/adapters/sign-token-adapter.js'
import { updateUserPassword } from '../infra/adapters/update-user-password-adapter.js'
import { updateUserPreferences } from '../infra/adapters/update-user-preferences-adapter.js'
import { createVerifyToken } from '../infra/adapters/verify-token-adapter.js'
import { verifyPassword } from '../infra/adapters/verify-password-adapter.js'
import {
  SocialLoginController,
  type SocialLoginControllerDependencies,
} from '../application/controllers/social-login-controller.js'
import { createSocialLoginRoute } from '../application/routes/social-login-route.js'
import type { SocialProvidersPorts } from '../domain/ports/social-login-output-ports.js'
import { CompleteSocialLoginUsecase } from '../domain/usecases/complete-social-login-usecase.js'
import { ConfirmSocialLinkUsecase } from '../domain/usecases/confirm-social-link-usecase.js'
import { DeclineSocialLinkUsecase } from '../domain/usecases/decline-social-link-usecase.js'
import { ExchangeSocialCodeUsecase } from '../domain/usecases/exchange-social-code-usecase.js'
import { PreviewSocialLinkUsecase } from '../domain/usecases/preview-social-link-usecase.js'
import { StartSocialLoginUsecase } from '../domain/usecases/start-social-login-usecase.js'
import { createBuildFacebookAuthorizationUrl } from '../infra/adapters/build-facebook-authorization-url-adapter.js'
import { createBuildGoogleAuthorizationUrl } from '../infra/adapters/build-google-authorization-url-adapter.js'
import { claimUnverifiedAccount } from '../infra/adapters/claim-unverified-account-adapter.js'
import { consumeOAuthState } from '../infra/adapters/consume-oauth-state-adapter.js'
import { consumeSocialLinkRequest } from '../infra/adapters/consume-social-link-request-adapter.js'
import { consumeSocialLoginCode } from '../infra/adapters/consume-social-login-code-adapter.js'
import { countRecentSocialLinkRequests } from '../infra/adapters/count-recent-social-link-requests-adapter.js'
import { createOAuthState } from '../infra/adapters/create-oauth-state-adapter.js'
import { createSocialClientUser } from '../infra/adapters/create-social-client-user-adapter.js'
import { createSocialLinkRequest } from '../infra/adapters/create-social-link-request-adapter.js'
import { createSocialLoginCode } from '../infra/adapters/create-social-login-code-adapter.js'
import { createExchangeFacebookCode } from '../infra/adapters/exchange-facebook-code-adapter.js'
import { createExchangeGoogleCode } from '../infra/adapters/exchange-google-code-adapter.js'
import { findSocialLinkRequest } from '../infra/adapters/find-social-link-request-adapter.js'
import { findUserBySocialIdentity } from '../infra/adapters/find-user-by-social-identity-adapter.js'
import { generateNonce } from '../infra/adapters/generate-nonce-adapter.js'
import { generateOAuthState } from '../infra/adapters/generate-oauth-state-adapter.js'
import { generatePkce } from '../infra/adapters/generate-pkce-adapter.js'
import { createGetFacebookProfile } from '../infra/adapters/get-facebook-profile-adapter.js'
import { incrementSocialLinkAttempts } from '../infra/adapters/increment-social-link-attempts-adapter.js'
import { linkSocialIdentity } from '../infra/adapters/link-social-identity-adapter.js'
import { replaceSocialIdentity } from '../infra/adapters/replace-social-identity-adapter.js'
import { createSendSocialLinkEmail } from '../infra/adapters/send-social-link-email-adapter.js'
import { createVerifyGoogleIdToken } from '../infra/adapters/verify-google-id-token-adapter.js'
import type { EnvConfig } from './load-env-config.js'

export type AppUsecases = AuthControllerDependencies &
  UserControllerDependencies &
  RegistrationControllerDependencies &
  SocialLoginControllerDependencies & { verifyToken: VerifyTokenPort }

const runInBackground: RunInBackgroundPort = (task) => {
  task().catch((error) => {
    // Only the error name: details could carry emails or tokens.
    console.error(`Background task failed: ${error instanceof Error ? error.name : 'unexpected value'}`)
  })
}

// Each provider joins its exchange and its validation. A provider without credentials is null.
export function createSocialProviders(config: EnvConfig): SocialProvidersPorts {
  const { google, facebook, clientAppUrl } = config
  let googlePorts: SocialProvidersPorts['google'] = null
  if (google) {
    const exchange = createExchangeGoogleCode(google, clientAppUrl)
    const verify = createVerifyGoogleIdToken(google)
    googlePorts = {
      buildAuthorizationUrl: createBuildGoogleAuthorizationUrl(google, clientAppUrl),
      fetchIdentity: async ({ code, verifier, nonce }) => verify({ idToken: await exchange({ code, verifier }), nonce }),
    }
  }
  let facebookPorts: SocialProvidersPorts['facebook'] = null
  if (facebook) {
    const exchange = createExchangeFacebookCode(facebook, clientAppUrl)
    const getProfile = createGetFacebookProfile(facebook)
    facebookPorts = {
      buildAuthorizationUrl: createBuildFacebookAuthorizationUrl(facebook, clientAppUrl),
      fetchIdentity: async ({ code, verifier }) => getProfile(await exchange({ code, verifier })),
    }
  }
  return { google: googlePorts, facebook: facebookPorts }
}

export async function createUsecases(config: EnvConfig): Promise<AppUsecases> {
  const now = () => new Date()
  const transport = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    requireTLS: config.smtp.requireTls,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.password } : undefined,
  })
  const signToken = createSignToken(config.jwtSecret)
  const appUrls: AppUrls = { ADMIN: config.adminAppUrl, CLIENT: config.clientAppUrl }
  const emailArguments: [EmailTransport, string, AppUrls] = [transport, config.smtp.from, appUrls]
  const hashNetwork = createHashNetwork(config.jwtSecret)
  const providers = createSocialProviders(config)
  const generateSessionId = () => crypto.randomUUID()
  const newNetwork = {
    hashNetwork,
    addKnownNetwork,
    generateResetToken,
    createPasswordResetToken,
    sendNewLocationEmail: createSendNewLocationEmail(...emailArguments),
    runInBackground,
  }
  const socialAccount = {
    findUserByEmail,
    findUserById,
    linkSocialIdentity,
    replaceSocialIdentity,
    claimUnverifiedAccount,
    invalidateEmailVerificationTokens,
    invalidatePasswordResetTokens,
    createSocialClientUser,
  }
  const verificationLink = {
    generateToken: generateResetToken,
    createEmailVerificationToken,
    sendVerificationEmail: createSendVerificationEmail(transport, config.smtp.from, config.clientAppUrl),
  }

  return {
    loginUser: new LoginUserUsecase({
      ...newNetwork,
      findUserByEmail,
      verifyPassword,
      recordFailedLogin,
      clearFailedLogins,
      sendLoginAttemptsEmail: createSendLoginAttemptsEmail(...emailArguments),
      generateSessionId,
      signToken,
      now,
      dummyPasswordHash: await hashPassword(crypto.randomUUID()),
    }),
    refreshToken: new RefreshTokenUsecase({ findUserById, signToken, now }),
    requestPasswordReset: new RequestPasswordResetUsecase({
      findUserByEmail,
      incrementPasswordResetRequests,
      invalidatePasswordResetTokens,
      generateResetToken,
      createPasswordResetToken,
      sendPasswordResetEmail: createSendPasswordResetEmail(...emailArguments),
      runInBackground,
      now,
    }),
    resetPassword: new ResetPasswordUsecase({
      hashResetToken,
      findPasswordResetToken,
      markPasswordResetTokenUsed,
      invalidatePasswordResetTokens,
      hashPassword,
      updateUserPassword,
      markEmailVerified,
      invalidateEmailVerificationTokens,
      now,
    }),
    registerClient: new RegisterClientUsecase({
      ...verificationLink,
      incrementRegistrationAttempts,
      hashNetwork,
      hashPassword,
      createClientUser,
      findUserByEmail,
      claimVerificationResend,
      sendSignupAttemptEmail: createSendSignupAttemptEmail(...emailArguments),
      runInBackground,
      now,
    }),
    verifyEmail: new VerifyEmailUsecase({
      hashToken: hashResetToken,
      consumeEmailVerificationToken,
      markEmailVerified,
      now,
    }),
    resendVerification: new ResendVerificationUsecase({
      ...verificationLink,
      findUserByEmail,
      claimVerificationResend,
      runInBackground,
      now,
    }),
    startSocialLogin: new StartSocialLoginUsecase({
      providers,
      generateState: generateOAuthState,
      generateNonce,
      generatePkce,
      hashValue: hashResetToken,
      createOAuthState,
      now,
    }),
    completeSocialLogin: new CompleteSocialLoginUsecase({
      ...socialAccount,
      ...newNetwork,
      providers,
      hashValue: hashResetToken,
      consumeOAuthState,
      findUserBySocialIdentity,
      generateToken: generateResetToken,
      createSocialLoginCode,
      incrementSocialLinkAttempts,
      countRecentSocialLinkRequests,
      createSocialLinkRequest,
      sendSocialLinkEmail: createSendSocialLinkEmail(transport, config.smtp.from, config.clientAppUrl),
      now,
    }),
    exchangeSocialCode: new ExchangeSocialCodeUsecase({
      hashValue: hashResetToken,
      consumeSocialLoginCode,
      findUserById,
      generateSessionId,
      signToken,
      now,
    }),
    previewSocialLink: new PreviewSocialLinkUsecase({ hashValue: hashResetToken, findSocialLinkRequest, now }),
    confirmSocialLink: new ConfirmSocialLinkUsecase({
      ...socialAccount,
      hashValue: hashResetToken,
      consumeSocialLinkRequest,
      findUserBySocialIdentity,
      now,
    }),
    declineSocialLink: new DeclineSocialLinkUsecase({ hashValue: hashResetToken, consumeSocialLinkRequest, now }),
    getCurrentUser: new GetCurrentUserUsecase(findUserById),
    updateUserPreferences: new UpdateUserPreferencesUsecase({ findUserById, updateUserPreferences }),
    verifyToken: createVerifyToken(config.jwtSecret),
  }
}

export function createApp(usecases: AppUsecases): Express {
  const app = express()
  const requireAuth = createRequireAuth(usecases.verifyToken)

  app.disable('x-powered-by')
  app.use(express.json({ limit: '10kb' }))
  app.use(createGetHealthRoute(new GetHealthController(new GetHealthUsecase())))
  // Every route after /health needs to know which system is calling.
  app.use(requireAppType)
  app.use(createAuthRoute(new AuthController(usecases), requireAuth))
  app.use(createUserRoute(new UserController(usecases), requireAuth))
  app.use(createRegistrationRoute(new RegistrationController(usecases)))
  app.use(createSocialLoginRoute(new SocialLoginController(usecases)))
  app.use(handleError)
  return app
}
