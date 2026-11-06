import { describe, expect, it, vi } from 'vitest'
import type { EmailTransport } from './create-email-link-adapter.js'
import { createSendLoginAttemptsEmail } from './send-login-attempts-email-adapter.js'

const makeTransport = () => ({ sendMail: vi.fn<EmailTransport['sendMail']>(async () => ({})) })
const sent = (transport: ReturnType<typeof makeTransport>) => transport.sendMail.mock.lastCall?.[0]

describe('createSendLoginAttemptsEmail', () => {
  const input = { to: 'ana@example.com', token: 'a+b', attempts: 3 }

  it('writes in Portuguese', async () => {
    const transport = makeTransport()
    await createSendLoginAttemptsEmail(transport, 'from@example.com', 'https://app.test/')({ ...input, language: 'pt-BR' })
    expect(sent(transport)).toMatchObject({ from: 'from@example.com', to: 'ana@example.com', subject: 'Tentativas de acesso à sua conta' })
    expect(sent(transport)?.text).toContain('https://app.test/forgot-password?token=a%2Bb')
    expect(sent(transport)?.text).toContain('2 horas')
  })

  it('writes in English', async () => {
    const transport = makeTransport()
    await createSendLoginAttemptsEmail(transport, 'from@example.com', 'https://app.test')({ ...input, language: 'en' })
    expect(sent(transport)?.subject).toBe('Sign-in attempts on your account')
    expect(sent(transport)?.text).toContain('https://app.test/forgot-password?token=a%2Bb')
    expect(sent(transport)?.text).toContain('2 hours')
  })
})
