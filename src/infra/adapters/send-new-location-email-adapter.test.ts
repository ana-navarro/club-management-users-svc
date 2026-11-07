import { describe, expect, it, vi } from 'vitest'
import type { EmailTransport } from './create-email-link-adapter.js'
import { createSendNewLocationEmail } from './send-new-location-email-adapter.js'

const makeTransport = () => ({ sendMail: vi.fn<EmailTransport['sendMail']>(async () => ({})) })
const sent = (transport: ReturnType<typeof makeTransport>) => transport.sendMail.mock.lastCall?.[0]

describe('createSendNewLocationEmail', () => {
  const input = { to: 'ana@example.com', token: 'a+b', when: new Date('2026-01-01T10:00:00Z'), userAgent: 'Firefox' }

  it('writes in Portuguese', async () => {
    const transport = makeTransport()
    await createSendNewLocationEmail(transport, 'from@example.com', 'https://app.test/')({ ...input, language: 'pt-BR' })
    expect(sent(transport)).toMatchObject({ from: 'from@example.com', to: 'ana@example.com', subject: 'Novo acesso à sua conta' })
    expect(sent(transport)?.text).toContain('https://app.test/forgot-password?token=a%2Bb')
    expect(sent(transport)?.text).toContain('2 horas')
  })

  it('writes in English', async () => {
    const transport = makeTransport()
    await createSendNewLocationEmail(transport, 'from@example.com', 'https://app.test')({ ...input, language: 'en' })
    expect(sent(transport)?.subject).toBe('New sign-in to your account')
    expect(sent(transport)?.text).toContain('https://app.test/forgot-password?token=a%2Bb')
    expect(sent(transport)?.text).toContain('2 hours')
  })

  it('tells the browser, or that it is unknown', async () => {
    const transport = makeTransport()
    await createSendNewLocationEmail(transport, 'f@e.com', 'https://a.test')({ ...input, language: 'en' })
    expect(sent(transport)?.text).toContain('Firefox')

    const other = makeTransport()
    await createSendNewLocationEmail(other, 'f@e.com', 'https://a.test')({ ...input, language: 'pt-BR', userAgent: undefined })
    expect(sent(other)?.text).toContain('Navegador: desconhecido')
  })
})
