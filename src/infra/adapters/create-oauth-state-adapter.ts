import type { CreateOAuthStatePort } from '../../domain/ports/social-login-output-ports.js'
import { OAuthStateModel } from '../schemas/oauth-states-schema.js'

export const createOAuthState: CreateOAuthStatePort = async (input) => {
  await OAuthStateModel.create(input)
}
