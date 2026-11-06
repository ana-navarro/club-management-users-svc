import mongoose, { Schema } from 'mongoose'

const usersSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
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
  },
  { timestamps: true },
)

export const UserModel = mongoose.model('User', usersSchema, 'users')
