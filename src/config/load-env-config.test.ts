import { expect, it } from 'vitest'
import { loadEnvConfig } from './load-env-config.js'

it('uses the default port when PORT is not set', () => {
  expect(loadEnvConfig({})).toEqual({ port: 3001 })
})

it('reads the port from PORT', () => {
  expect(loadEnvConfig({ PORT: '9000' })).toEqual({ port: 9000 })
})
