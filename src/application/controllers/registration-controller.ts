import type { Request, Response } from 'express'
import { NotFoundError } from '../../domain/models/auth-errors-model.js'
import type {
  RegisterClientInputPort,
  ResendVerificationInputPort,
  VerifyEmailInputPort,
} from '../../domain/ports/registration-input-ports.js'
import { registerRequestDto, resendVerificationRequestDto, verifyEmailRequestDto } from '../dto/registration-dto.js'
import type { AppTypeLocals } from '../middlewares/require-app-type-middleware.js'

export type RegistrationControllerDependencies = {
  registerClient: RegisterClientInputPort
  verifyEmail: VerifyEmailInputPort
  resendVerification: ResendVerificationInputPort
}

export class RegistrationController {
  private readonly deps: RegistrationControllerDependencies

  constructor(deps: RegistrationControllerDependencies) {
    this.deps = deps
  }

  // The admin system has no sign-up (spec FR-004).
  register = async (request: Request, response: Response<object, AppTypeLocals>): Promise<void> => {
    if (response.locals.appType !== 'CLIENT') throw new NotFoundError()
    await this.deps.registerClient.execute(registerRequestDto.parse(request.body))
    response.status(202).end()
  }

  verifyEmail = async (request: Request, response: Response): Promise<void> => {
    await this.deps.verifyEmail.execute(verifyEmailRequestDto.parse(request.body))
    response.status(204).end()
  }

  resendVerification = (request: Request, response: Response): void => {
    this.deps.resendVerification.execute(resendVerificationRequestDto.parse(request.body))
    response.status(202).end()
  }
}
