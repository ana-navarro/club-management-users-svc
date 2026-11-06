import type { GetHealthInputPort, Health } from '../ports/get-health-input-port.js'

export class GetHealthUsecase implements GetHealthInputPort {
  execute(): Health {
    return { status: 'ok' }
  }
}
