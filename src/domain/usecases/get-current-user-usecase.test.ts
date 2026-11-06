import { expect, it, vi } from 'vitest'
import { InvalidTokenError } from '../models/auth-errors-model.js'
import { makeClaims, makeUser } from '../models/user-model.mock.js'
import { GetCurrentUserUsecase } from './get-current-user-usecase.js'

const user = makeUser({ tokenVersion: 2 })
const claims = makeClaims({ tokenVersion: 2 })

it('returns the public user', async () => {
  const result = await new GetCurrentUserUsecase(vi.fn(async () => user)).execute(claims)
  expect(result.id).toBe('u1')
  expect(result).not.toHaveProperty('tokenVersion')
})

it('rejects a token from before a password change', async () => {
  await expect(
    new GetCurrentUserUsecase(vi.fn(async () => user)).execute({ ...claims, tokenVersion: 1 }),
  ).rejects.toThrow(InvalidTokenError)
})
