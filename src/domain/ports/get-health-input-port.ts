export type Health = { status: 'ok' }

export interface GetHealthInputPort {
  execute(): Health
}
