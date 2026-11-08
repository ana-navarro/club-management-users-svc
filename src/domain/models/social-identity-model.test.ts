import { expect, it } from 'vitest'
import { toSocialProvider } from './social-identity-model.js'

it('accepts only the known providers', () => {
  expect(toSocialProvider('google')).toBe('google')
  expect(toSocialProvider('facebook')).toBe('facebook')
  expect(toSocialProvider('instagram')).toBeNull()
  expect(toSocialProvider(undefined)).toBeNull()
})
