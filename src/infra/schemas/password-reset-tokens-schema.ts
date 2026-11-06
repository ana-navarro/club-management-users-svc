import mongoose, { Schema } from 'mongoose'

const passwordResetTokensSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, expires: 0 },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export const PasswordResetTokenModel = mongoose.model(
  'PasswordResetToken',
  passwordResetTokensSchema,
  'passwordResetTokens',
)
