import type { UserType } from '../../domain/models/user-model.js'
import { describe, expect, it, vi } from 'vitest'
import type { EmailTransport } from './create-email-link-adapter.js'
import { createSendPasswordResetEmail } from './send-password-reset-email-adapter.js'

const makeTransport = () => ({ sendMail: vi.fn<EmailTransport['sendMail']>(async () => ({})) })
const sent = (transport: ReturnType<typeof makeTransport>) => transport.sendMail.mock.lastCall?.[0]

const userType: UserType = 'ADMIN'

describe('createSendPasswordResetEmail', () => {
  const input = { to: 'ana@example.com', token: 'a+b', userType }

  it('writes in Portuguese', async () => {
    const transport = makeTransport()
    await createSendPasswordResetEmail(transport, 'from@example.com', { ADMIN: 'https://app.test/', CLIENT: 'https://client.test' })({ ...input, language: 'pt-BR' })
    expect(sent(transport)).toMatchObject({ from: 'from@example.com', to: 'ana@example.com', subject: 'Redefinição de senha' })
    expect(sent(transport)?.text).toContain('https://app.test/forgot-password?token=a%2Bb')
    expect(sent(transport)?.text).toContain('2 horas')
  })

  it('writes in English', async () => {
    const transport = makeTransport()
    await createSendPasswordResetEmail(transport, 'from@example.com', { ADMIN: 'https://app.test', CLIENT: 'https://client.test' })({ ...input, language: 'en' })
    expect(sent(transport)?.subject).toBe('Password reset')
    expect(sent(transport)?.text).toContain('https://app.test/forgot-password?token=a%2Bb')
    expect(sent(transport)?.text).toContain('2 hours')
  })
})

describe('the link of each system', () => {
  it('points a client account to the client app', async () => {
    const transport = makeTransport()
    const client: UserType = 'CLIENT'
    await createSendPasswordResetEmail(transport, 'f@e.com', { ADMIN: 'https://admin.test', CLIENT: 'https://client.test' })({
      to: 'ana@example.com',
      token: 't',
      userType: client,
      language: 'en',
    })
    expect(sent(transport)?.text).toContain('https://client.test/forgot-password?token=t')
    expect(sent(transport)?.text).not.toContain('admin.test')
  })
})
