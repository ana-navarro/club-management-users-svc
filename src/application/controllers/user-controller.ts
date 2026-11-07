import type { Request } from 'express'
import type { GetCurrentUserInputPort, UpdateUserPreferencesInputPort } from '../../domain/ports/auth-input-ports.js'
import { publicUserResponseDto, updatePreferencesRequestDto } from '../dto/auth-dto.js'
import type { AuthenticatedResponse } from '../middlewares/require-auth-middleware.js'

export type UserControllerDependencies = {
  getCurrentUser: GetCurrentUserInputPort
  updateUserPreferences: UpdateUserPreferencesInputPort
}

export class UserController {
  private readonly deps: UserControllerDependencies

  constructor(deps: UserControllerDependencies) {
    this.deps = deps
  }

  getMe = async (_request: Request, response: AuthenticatedResponse): Promise<void> => {
    const user = await this.deps.getCurrentUser.execute(response.locals.claims)
    response.status(200).json(publicUserResponseDto.parse(user))
  }

  updatePreferences = async (request: Request, response: AuthenticatedResponse): Promise<void> => {
    const preferences = updatePreferencesRequestDto.parse(request.body)
    const user = await this.deps.updateUserPreferences.execute(response.locals.claims, preferences)
    response.status(200).json(publicUserResponseDto.parse(user))
  }
}
