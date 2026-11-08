import mongoose, { Schema } from 'mongoose'

const socialIdentitySchema = new Schema(
  {
    provider: { type: String, required: true, enum: ['google', 'facebook'] },
    subject: { type: String, required: true },
    linkedAt: { type: Date, required: true },
  },
  { _id: false },
)

const usersSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, default: null },
    type: { type: String, required: true, enum: ['ADMIN', 'CLIENT'] },
    clubIds: { type: [Schema.Types.ObjectId], default: [], index: true },
    theme: { type: String, enum: ['light', 'dark', null], default: null },
    language: { type: String, enum: ['pt-BR', 'en', null], default: null },
    tokenVersion: { type: Number, default: 0 },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    passwordResetRequests: { type: Number, default: 0 },
    passwordResetWindowStartedAt: { type: Date, default: null },
    knownNetworks: { type: [String], default: [] },
    emailVerifiedAt: { type: Date, default: null },
    verificationEmailSentAt: { type: Date, default: null },
    socialIdentities: { type: [socialIdentitySchema], default: [] },
  },
  { timestamps: true },
)

// Partial and not sparse: MongoDB indexes an empty array as undefined, and sparse does not skip a field
// that exists, so two users without identities would collide (data-model.md).
usersSchema.index(
  { 'socialIdentities.provider': 1, 'socialIdentities.subject': 1 },
  { unique: true, partialFilterExpression: { 'socialIdentities.subject': { $exists: true } } },
)

export const UserModel = mongoose.model('User', usersSchema, 'users')
