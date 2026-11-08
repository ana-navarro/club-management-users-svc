import mongoose, { Schema } from 'mongoose'

// One social login attempt, from the button to the provider return (data-model.md).
const oauthStatesSchema = new Schema({
  stateHash: { type: String, required: true, unique: true },
  bindingHash: { type: String, required: true },
  provider: { type: String, required: true, enum: ['google', 'facebook'] },
  // PKCE. It never leaves this service.
  codeVerifier: { type: String, required: true },
  nonce: { type: String, default: null },
  language: { type: String, enum: ['pt-BR', 'en', null], default: null },
  // 10 minutes. The TTL index deletes it afterwards.
  expiresAt: { type: Date, required: true, expires: 0 },
  usedAt: { type: Date, default: null },
})

export const OAuthStateModel = mongoose.model('OAuthState', oauthStatesSchema, 'oauthStates')
