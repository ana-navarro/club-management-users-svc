import type { CreateSocialLoginCodePort } from '../../domain/ports/social-login-output-ports.js'
import { SocialLoginCodeModel } from '../schemas/social-login-codes-schema.js'

export const createSocialLoginCode: CreateSocialLoginCodePort = async (input) => {
  await SocialLoginCodeModel.create(input)
}
