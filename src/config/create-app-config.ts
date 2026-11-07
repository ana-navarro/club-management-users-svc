import express, { type Express } from 'express'
import nodemailer from 'nodemailer'
import { AuthController, type AuthControllerDependencies } from '../application/controllers/auth-controller.js'
import { GetHealthController } from '../application/controllers/get-health-controller.js'
import { UserController, type UserControllerDependencies } from '../application/controllers/user-controller.js'
import { handleError } from '../application/middlewares/handle-error-middleware.js'
import { createRequireAuth } from '../application/middlewares/require-auth-middleware.js'
import { createAuthRoute } from '../application/routes/auth-route.js'
import { createGetHealthRoute } from '../application/routes/get-health-route.js'
import { createUserRoute } from '../application/routes/user-route.js'
import type { RunInBackgroundPort, VerifyTokenPort } from '../domain/ports/auth-output-ports.js'
import { GetCurrentUserUsecase } from '../domain/usecases/get-current-user-usecase.js'
import { GetHealthUsecase } from '../domain/usecases/get-health-usecase.js'
import { LoginUserUsecase } from '../domain/usecases/login-user-usecase.js'
import { RefreshTokenUsecase } from '../domain/usecases/refresh-token-usecase.js'
import { RequestPasswordResetUsecase } from '../domain/usecases/request-password-reset-usecase.js'
import { ResetPasswordUsecase } from '../domain/usecases/reset-password-usecase.js'
import { UpdateUserPreferencesUsecase } from '../domain/usecases/update-user-preferences-usecase.js'
import { addKnownNetwork } from '../infra/adapters/add-known-network-adapter.js'
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
import type { EmailTransport } from '../infra/adapters/create-email-link-adapter.js'
import { createSendPasswordResetEmail } from '../infra/adapters/send-password-reset-email-adapter.js'
import { createSignToken } from '../infra/adapters/sign-token-adapter.js'
import { updateUserPassword } from '../infra/adapters/update-user-password-adapter.js'
import { updateUserPreferences } from '../infra/adapters/update-user-preferences-adapter.js'
import { createVerifyToken } from '../infra/adapters/verify-token-adapter.js'
import { verifyPassword } from '../infra/adapters/verify-password-adapter.js'
import type { EnvConfig } from './load-env-config.js'

export type AppUsecases = AuthControllerDependencies & UserControllerDependencies & { verifyToken: VerifyTokenPort }

const runInBackground: RunInBackgroundPort = (task) => {
  task().catch((error) => {
    // Only the error name: details could carry emails or tokens.
    console.error(`Background task failed: ${error instanceof Error ? error.name : 'unexpected value'}`)
  })
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
  const emailArguments: [EmailTransport, string, string] = [transport, config.smtp.from, config.appUrl]

  return {
    loginUser: new LoginUserUsecase({
      findUserByEmail,
      verifyPassword,
      recordFailedLogin,
      clearFailedLogins,
      addKnownNetwork,
      hashNetwork: createHashNetwork(config.jwtSecret),
      generateResetToken,
      createPasswordResetToken,
      sendLoginAttemptsEmail: createSendLoginAttemptsEmail(...emailArguments),
      sendNewLocationEmail: createSendNewLocationEmail(...emailArguments),
      generateSessionId: () => crypto.randomUUID(),
      signToken,
      runInBackground,
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
      now,
    }),
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
  app.use(createAuthRoute(new AuthController(usecases), requireAuth))
  app.use(createUserRoute(new UserController(usecases), requireAuth))
  app.use(handleError)
  return app
}
