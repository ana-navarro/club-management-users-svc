import mongoose from 'mongoose'
import { toLanguage, toTheme, toUserType, type User } from '../../domain/models/user-model.js'
import { ClubModel } from '../schemas/clubs-schema.js'

export type UserDocument = {
  _id: mongoose.Types.ObjectId
  name: string
  email: string
  passwordHash: string
  type: string
  clubIds: mongoose.Types.ObjectId[]
  theme?: string | null
  language?: string | null
  tokenVersion: number
  lockedUntil?: Date | null
  knownNetworks: string[]
}

export async function mapUser(document: UserDocument): Promise<User> {
  const clubs = await ClubModel.find({ _id: { $in: document.clubIds } }).lean()
  return {
    id: document._id.toString(),
    name: document.name,
    email: document.email,
    passwordHash: document.passwordHash,
    type: toUserType(document.type),
    clubs: clubs.map((club) => ({ id: club._id.toString(), name: club.name })),
    theme: toTheme(document.theme),
    language: toLanguage(document.language),
    tokenVersion: document.tokenVersion,
    lockedUntil: document.lockedUntil ?? null,
    knownNetworks: document.knownNetworks,
  }
}
