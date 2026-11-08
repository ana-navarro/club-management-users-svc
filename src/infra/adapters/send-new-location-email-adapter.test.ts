import type { UserType } from '../../domain/models/user-model.js'
import { describe, expect, it, vi } from 'vitest'
import type { EmailTransport } from './create-email-link-adapter.js'
import { createSendNewLocationEmail } from './send-new-location-email-adapter.js'

const makeTransport = () => ({ sendMail: vi.fn<EmailTransport['sendMail']>(async () => ({})) })
const sent = (transport: ReturnType<typeof makeTransport>) => transport.sendMail.mock.lastCall?.[0]

const userType: UserType = 'ADMIN'
const input = { to: 'ana@example.com', token: 'a+b', userType, when: new Date('2026-01-01T10:00:00Z'), userAgent: 'Firefox' }

describe('createSendNewLocationEmail', () => {

  it('writes in Portuguese', async () => {
    const transport = makeTransport()
    await createSendNewLocationEmail(transport, 'from@example.com', { ADMIN: 'https://app.test/', CLIENT: 'https://client.test' })({ ...input, language: 'pt-BR' })
    expect(sent(transport)).toMatchObject({ from: 'from@example.com', to: 'ana@example.com', subject: 'Novo acesso à sua conta' })
    expect(sent(transport)?.text).toContain('https://app.test/forgot-password?token=a%2Bb')
    expect(sent(transport)?.text).toContain('2 horas')
  })

  it('writes in English', async () => {
    const transport = makeTransport()
    await createSendNewLocationEmail(transport, 'from@example.com', { ADMIN: 'https://app.test', CLIENT: 'https://client.test' })({ ...input, language: 'en' })
    expect(sent(transport)?.subject).toBe('New sign-in to your account')
    expect(sent(transport)?.text).toContain('https://app.test/forgot-password?token=a%2Bb')
    expect(sent(transport)?.text).toContain('2 hours')
  })

  it('tells the browser, or that it is unknown', async () => {
    const transport = makeTransport()
    await createSendNewLocationEmail(transport, 'f@e.com', { ADMIN: 'https://a.test', CLIENT: 'https://c.test' })({ ...input, language: 'en' })
    expect(sent(transport)?.text).toContain('Firefox')

    const other = makeTransport()
    await createSendNewLocationEmail(other, 'f@e.com', { ADMIN: 'https://a.test', CLIENT: 'https://c.test' })({ ...input, language: 'pt-BR', userAgent: undefined })
    expect(sent(other)?.text).toContain('Navegador: desconhecido')
  })
})

it('points a client account to the client app', async () => {
  const transport = makeTransport()
  const client: UserType = 'CLIENT'
  await createSendNewLocationEmail(transport, 'f@e.com', { ADMIN: 'https://admin.test', CLIENT: 'https://client.test' })({
    ...input,
    userType: client,
    language: 'en',
  })
  expect(sent(transport)?.text).toContain('https://client.test/forgot-password?token=')
})
