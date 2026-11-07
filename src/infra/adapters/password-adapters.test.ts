import { expect, it } from 'vitest'
import { generateResetToken, hashResetToken } from './generate-reset-token-adapter.js'
import { hashPassword } from './hash-password-adapter.js'
import { verifyPassword } from './verify-password-adapter.js'

it('hashes passwords so that only the right one verifies', async () => {
  const hash = await hashPassword('my-password')
  expect(hash).not.toContain('my-password')
  await expect(verifyPassword(hash, 'my-password')).resolves.toBe(true)
  await expect(verifyPassword(hash, 'other')).resolves.toBe(false)
})

it('generates a different reset token each time and stores only its hash', () => {
  const first = generateResetToken()
  const second = generateResetToken()
  expect(first.token).not.toBe(second.token)
  expect(first.tokenHash).toBe(hashResetToken(first.token))
  expect(first.tokenHash).not.toContain(first.token)
})
