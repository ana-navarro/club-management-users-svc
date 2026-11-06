import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { claims, makeApp, makeUsecases, publicUser } from './test-app.mock.js'

describe('/users/me', () => {
  it('returns the user', async () => {
    const response = await request(makeApp()).get('/users/me').set('authorization', 'Bearer good')
    expect(response.status).toBe(200)
    expect(response.body).toEqual(publicUser)
  })

  it('requires a token', async () => {
    expect((await request(makeApp()).get('/users/me')).status).toBe(401)
  })

  it('saves preferences', async () => {
    const usecases = makeUsecases()
    const response = await request(makeApp(usecases))
      .patch('/users/me/preferences')
      .set('authorization', 'Bearer good')
      .send({ theme: 'dark' })
    expect(response.status).toBe(200)
    expect(usecases.updateUserPreferences.execute).toHaveBeenCalledWith(claims, { theme: 'dark' })
  })

  it.each([[{}], [{ theme: 'blue' }], [{ language: 'fr' }], [{ theme: 'dark', other: 1 }]])(
    'refuses %j',
    async (body) => {
      const response = await request(makeApp())
        .patch('/users/me/preferences')
        .set('authorization', 'Bearer good')
        .send(body)
      expect(response.status).toBe(400)
    },
  )
})
