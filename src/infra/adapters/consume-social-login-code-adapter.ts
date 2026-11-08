import type { ConsumeSocialLoginCodePort } from '../../domain/ports/social-login-output-ports.js'
import { SocialLoginCodeModel } from '../schemas/social-login-codes-schema.js'

export const consumeSocialLoginCode: ConsumeSocialLoginCodePort = async (codeHash, now) => {
  const document = await SocialLoginCodeModel.findOneAndUpdate(
    { codeHash: { $eq: codeHash }, usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
  ).lean()
  return document ? document.userId.toString() : null
}
