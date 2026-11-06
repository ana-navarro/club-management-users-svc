import { expect, it } from 'vitest'
import { GetHealthUsecase } from './get-health-usecase.js'

it('reports the service as ok', () => {
  expect(new GetHealthUsecase().execute()).toEqual({ status: 'ok' })
})
