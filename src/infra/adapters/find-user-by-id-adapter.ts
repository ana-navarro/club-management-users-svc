import mongoose from 'mongoose'
import type { FindUserByIdPort } from '../../domain/ports/auth-output-ports.js'
import { UserModel } from '../schemas/users-schema.js'
import { mapUser } from './map-user-adapter.js'

export const findUserById: FindUserByIdPort = async (id) => {
  if (!mongoose.isValidObjectId(id)) return null
  const document = await UserModel.findById(id).lean()
  return document ? mapUser(document) : null
}
