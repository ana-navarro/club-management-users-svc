import mongoose, { Schema } from 'mongoose'

// Counts attempts per network in a one hour window. The same shape serves other limits by network.
export const networkAttemptsSchema = new Schema({
  networkHash: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  // One hour after the first attempt of the window. The TTL index deletes it afterwards.
  expiresAt: { type: Date, required: true, expires: 0 },
})

export const RegistrationAttemptModel = mongoose.model(
  'RegistrationAttempt',
  networkAttemptsSchema,
  'registrationAttempts',
)

export type NetworkAttemptModel = typeof RegistrationAttemptModel
