import mongoose, { Schema } from 'mongoose'

const emailVerificationTokensSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    // 24 hours after creation. The TTL index deletes it afterwards.
    expiresAt: { type: Date, required: true, expires: 0 },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export const EmailVerificationTokenModel = mongoose.model(
  'EmailVerificationToken',
  emailVerificationTokensSchema,
  'emailVerificationTokens',
)
