import mongoose, { Schema } from 'mongoose'
import { MAXIMUM_PROFILE_NAME_LENGTH } from '../../domain/models/social-identity-model.js'

// A first Facebook entry waiting for the email confirmation (spec FR-014c, research R5a).
// No Facebook token is stored.
const socialLinkRequestsSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    // Only Facebook asks for this confirmation today, but the shape fits any provider.
    provider: { type: String, required: true, enum: ['google', 'facebook'] },
    subject: { type: String, required: true },
    email: { type: String, required: true },
    profileName: { type: String, required: true, maxlength: MAXIMUM_PROFILE_NAME_LENGTH },
    language: { type: String, enum: ['pt-BR', 'en', null], default: null },
    // 24 hours. The TTL index deletes it afterwards.
    expiresAt: { type: Date, required: true, expires: 0 },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

// For the limits of 1 email per minute and 5 in 24 hours per address.
socialLinkRequestsSchema.index({ email: 1, createdAt: -1 })
socialLinkRequestsSchema.index({ provider: 1, subject: 1 })

export const SocialLinkRequestModel = mongoose.model(
  'SocialLinkRequest',
  socialLinkRequestsSchema,
  'socialLinkRequests',
)
