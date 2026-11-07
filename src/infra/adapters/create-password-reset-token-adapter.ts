import type { CreatePasswordResetTokenPort } from '../../domain/ports/auth-output-ports.js'
import { PasswordResetTokenModel } from '../schemas/password-reset-tokens-schema.js'

export const createPasswordResetToken: CreatePasswordResetTokenPort = async (input) => {
  await PasswordResetTokenModel.create(input)
}
