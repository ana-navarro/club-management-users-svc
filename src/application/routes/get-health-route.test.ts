import request from 'supertest'
import { expect, it } from 'vitest'
import { createApp } from '../../config/create-app-config.js'

it('GET /health responds with the service status', async () => {
  const response = await request(createApp()).get('/health')

  expect(response.status).toBe(200)
  expect(response.body).toEqual({ status: 'ok' })
})
