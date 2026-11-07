import { describe, expect, it, vi } from 'vitest'
import type { EmailTransport } from './create-email-link-adapter.js'
import { createSendPasswordResetEmail } from './send-password-reset-email-adapter.js'

const makeTransport = () => ({ sendMail: vi.fn<EmailTransport['sendMail']>(async () => ({})) })
const sent = (transport: ReturnType<typeof makeTransport>) => transport.sendMail.mock.lastCall?.[0]

describe('createSendPasswordResetEmail', () => {
  const input = { to: 'ana@example.com', token: 'a+b' }

  it('writes in Portuguese', async () => {
    const transport = makeTransport()
    await createSendPasswordResetEmail(transport, 'from@example.com', 'https://app.test/')({ ...input, language: 'pt-BR' })
    expect(sent(transport)).toMatchObject({ from: 'from@example.com', to: 'ana@example.com', subject: 'Redefinição de senha' })
    expect(sent(transport)?.text).toContain('https://app.test/forgot-password?token=a%2Bb')
    expect(sent(transport)?.text).toContain('2 horas')
  })

  it('writes in English', async () => {
    const transport = makeTransport()
    await createSendPasswordResetEmail(transport, 'from@example.com', 'https://app.test')({ ...input, language: 'en' })
    expect(sent(transport)?.subject).toBe('Password reset')
    expect(sent(transport)?.text).toContain('https://app.test/forgot-password?token=a%2Bb')
    expect(sent(transport)?.text).toContain('2 hours')
  })
})
