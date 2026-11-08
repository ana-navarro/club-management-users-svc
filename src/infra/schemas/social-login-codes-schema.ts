import mongoose, { Schema } from 'mongoose'

// The exchange code given to the frontend in the URL fragment, traded once for the session.
const socialLoginCodesSchema = new Schema({
  codeHash: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  // 60 seconds. The TTL index deletes it afterwards.
  expiresAt: { type: Date, required: true, expires: 0 },
  usedAt: { type: Date, default: null },
})

export const SocialLoginCodeModel = mongoose.model('SocialLoginCode', socialLoginCodesSchema, 'socialLoginCodes')
