import { expect, it, vi } from 'vitest'
import { InvalidTokenError } from '../models/auth-errors-model.js'
import { makeClaims, makeUser } from '../models/user-model.mock.js'
import { UpdateUserPreferencesUsecase } from './update-user-preferences-usecase.js'

const user = makeUser({ theme: 'dark' })
const claims = makeClaims()

it('saves the preferences and returns the updated user', async () => {
  const updateUserPreferences = vi.fn(async () => undefined)
  const usecase = new UpdateUserPreferencesUsecase({ findUserById: vi.fn(async () => user), updateUserPreferences })

  const result = await usecase.execute(claims, { theme: 'dark' })

  expect(updateUserPreferences).toHaveBeenCalledWith('u1', { theme: 'dark' })
  expect(result.preferences.theme).toBe('dark')
})

it('saves nothing with an old token', async () => {
  const updateUserPreferences = vi.fn(async () => undefined)
  const usecase = new UpdateUserPreferencesUsecase({ findUserById: vi.fn(async () => user), updateUserPreferences })

  await expect(usecase.execute({ ...claims, tokenVersion: 9 }, { theme: 'dark' })).rejects.toThrow(InvalidTokenError)
  expect(updateUserPreferences).not.toHaveBeenCalled()
})
