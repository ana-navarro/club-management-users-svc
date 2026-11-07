import request from 'supertest'
import { expect, it } from 'vitest'
import { makeApp } from './test-app.mock.js'

it('GET /health responds with the service status', async () => {
  const response = await request(makeApp()).get('/health')

  expect(response.status).toBe(200)
  expect(response.body).toEqual({ status: 'ok' })
})
