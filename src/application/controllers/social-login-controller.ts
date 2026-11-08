import type { Request, Response } from 'express'
import { NotFoundError } from '../../domain/models/auth-errors-model.js'
import { toSocialProvider, type SocialProvider } from '../../domain/models/social-identity-model.js'
import type {
  CompleteSocialLoginInputPort,
  ConfirmSocialLinkInputPort,
  DeclineSocialLinkInputPort,
  ExchangeSocialCodeInputPort,
  PreviewSocialLinkInputPort,
  StartSocialLoginInputPort,
} from '../../domain/ports/social-login-input-ports.js'
import {
  authorizationRequestDto,
  authorizationResponseDto,
  callbackRequestDto,
  socialLinkPreviewResponseDto,
  socialLinkRequestDto,
  socialSessionRequestDto,
  socialSessionResponseDto,
} from '../dto/social-login-dto.js'
import type { AppTypeLocals } from '../middlewares/require-app-type-middleware.js'

export type SocialLoginControllerDependencies = {
  startSocialLogin: StartSocialLoginInputPort
  completeSocialLogin: CompleteSocialLoginInputPort
  exchangeSocialCode: ExchangeSocialCodeInputPort
  previewSocialLink: PreviewSocialLinkInputPort
  confirmSocialLink: ConfirmSocialLinkInputPort
  declineSocialLink: DeclineSocialLinkInputPort
}

type SocialResponse = Response<object, AppTypeLocals>

// Social login exists only in the client system (spec FR-004), so the admin system gets 404.
const assertClientSystem = (response: SocialResponse): void => {
  if (response.locals.appType !== 'CLIENT') throw new NotFoundError()
}

const readProvider = (request: Request): SocialProvider => {
  const provider = toSocialProvider(String(request.params.provider))
  if (!provider) throw new NotFoundError()
  return provider
}

export class SocialLoginController {
  private readonly deps: SocialLoginControllerDependencies

  constructor(deps: SocialLoginControllerDependencies) {
    this.deps = deps
  }

  authorization = async (request: Request, response: SocialResponse): Promise<void> => {
    assertClientSystem(response)
    const provider = readProvider(request)
    const body = authorizationRequestDto.parse(request.body)
    const result = await this.deps.startSocialLogin.execute({ provider, ...body })
    response.status(200).json(authorizationResponseDto.parse(result))
  }

  callback = async (request: Request, response: SocialResponse): Promise<void> => {
    assertClientSystem(response)
    const provider = readProvider(request)
    const body = callbackRequestDto.parse(request.body)
    const result = await this.deps.completeSocialLogin.execute({ provider, ...body })
    if (result.status === 'pending') {
      response.status(202).json({ pending: 'email_confirmation' })
      return
    }
    response.status(200).json({ code: result.code })
  }

  session = async (request: Request, response: SocialResponse): Promise<void> => {
    assertClientSystem(response)
    const result = await this.deps.exchangeSocialCode.execute(socialSessionRequestDto.parse(request.body))
    response.status(200).json(socialSessionResponseDto.parse(result))
  }

  previewLink = async (request: Request, response: SocialResponse): Promise<void> => {
    assertClientSystem(response)
    const result = await this.deps.previewSocialLink.execute(socialLinkRequestDto.parse(request.body))
    response.status(200).json(socialLinkPreviewResponseDto.parse(result))
  }

  confirmLink = async (request: Request, response: SocialResponse): Promise<void> => {
    assertClientSystem(response)
    await this.deps.confirmSocialLink.execute(socialLinkRequestDto.parse(request.body))
    response.status(204).end()
  }

  declineLink = async (request: Request, response: SocialResponse): Promise<void> => {
    assertClientSystem(response)
    await this.deps.declineSocialLink.execute(socialLinkRequestDto.parse(request.body))
    response.status(204).end()
  }
}
