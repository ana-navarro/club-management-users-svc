import type { Request, Response } from 'express'
import type { GetHealthInputPort } from '../../domain/ports/get-health-input-port.js'
import { getHealthResponseDto } from '../dto/get-health-dto.js'

export class GetHealthController {
  private readonly usecase: GetHealthInputPort

  constructor(usecase: GetHealthInputPort) {
    this.usecase = usecase
  }

  handle = (_request: Request, response: Response): void => {
    response.status(200).json(getHealthResponseDto.parse(this.usecase.execute()))
  }
}
