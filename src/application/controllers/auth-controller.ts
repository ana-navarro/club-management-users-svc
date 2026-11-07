import type { Request, Response } from 'express'
import type {
  LoginUserInputPort,
  RefreshTokenInputPort,
  RequestPasswordResetInputPort,
  ResetPasswordInputPort,
} from '../../domain/ports/auth-input-ports.js'
import type { AuthenticatedResponse } from '../middlewares/require-auth-middleware.js'
import {
  forgotPasswordRequestDto,
  loginRequestDto,
  loginResponseDto,
  resetPasswordRequestDto,
  sessionResponseDto,
} from '../dto/auth-dto.js'

export type AuthControllerDependencies = {
  loginUser: LoginUserInputPort
  refreshToken: RefreshTokenInputPort
  requestPasswordReset: RequestPasswordResetInputPort
  resetPassword: ResetPasswordInputPort
}

export class AuthController {
  private readonly deps: AuthControllerDependencies

  constructor(deps: AuthControllerDependencies) {
    this.deps = deps
  }

  login = async (request: Request, response: Response): Promise<void> => {
    const result = await this.deps.loginUser.execute(loginRequestDto.parse(request.body))
    response.status(200).json(loginResponseDto.parse(result))
  }

  refresh = async (_request: Request, response: AuthenticatedResponse): Promise<void> => {
    const result = await this.deps.refreshToken.execute(response.locals.claims)
    response.status(200).json(sessionResponseDto.parse(result))
  }

  forgotPassword = (request: Request, response: Response): void => {
    this.deps.requestPasswordReset.execute(forgotPasswordRequestDto.parse(request.body))
    response.status(202).end()
  }

  resetPassword = async (request: Request, response: Response): Promise<void> => {
    await this.deps.resetPassword.execute(resetPasswordRequestDto.parse(request.body))
    response.status(204).end()
  }
}
