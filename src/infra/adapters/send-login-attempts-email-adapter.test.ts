import type { UserType } from '../../domain/models/user-model.js'
import { describe, expect, it, vi } from 'vitest'
import type { EmailTransport } from './create-email-link-adapter.js'
import { createSendLoginAttemptsEmail } from './send-login-attempts-email-adapter.js'

const makeTransport = () => ({ sendMail: vi.fn<EmailTransport['sendMail']>(async () => ({})) })
const sent = (transport: ReturnType<typeof makeTransport>) => transport.sendMail.mock.lastCall?.[0]

const userType: UserType = 'ADMIN'
const input = { to: 'ana@example.com', token: 'a+b', userType, attempts: 3 }

describe('createSendLoginAttemptsEmail', () => {

  it('writes in Portuguese', async () => {
    const transport = makeTransport()
    await createSendLoginAttemptsEmail(transport, 'from@example.com', { ADMIN: 'https://app.test/', CLIENT: 'https://client.test' })({ ...input, language: 'pt-BR' })
    expect(sent(transport)).toMatchObject({ from: 'from@example.com', to: 'ana@example.com', subject: 'Tentativas de acesso à sua conta' })
    expect(sent(transport)?.text).toContain('https://app.test/forgot-password?token=a%2Bb')
    expect(sent(transport)?.text).toContain('2 horas')
  })

  it('writes in English', async () => {
    const transport = makeTransport()
    await createSendLoginAttemptsEmail(transport, 'from@example.com', { ADMIN: 'https://app.test', CLIENT: 'https://client.test' })({ ...input, language: 'en' })
    expect(sent(transport)?.subject).toBe('Sign-in attempts on your account')
    expect(sent(transport)?.text).toContain('https://app.test/forgot-password?token=a%2Bb')
    expect(sent(transport)?.text).toContain('2 hours')
  })
})

it('points a client account to the client app', async () => {
  const transport = makeTransport()
  const client: UserType = 'CLIENT'
  await createSendLoginAttemptsEmail(transport, 'f@e.com', { ADMIN: 'https://admin.test', CLIENT: 'https://client.test' })({
    ...input,
    userType: client,
    language: 'en',
  })
  expect(sent(transport)?.text).toContain('https://client.test/forgot-password?token=')
})
