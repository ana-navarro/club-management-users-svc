import { describe, expect, it, vi } from 'vitest'
import type { UserType } from '../../domain/models/user-model.js'
import type { EmailTransport } from './create-email-link-adapter.js'
import { createSendSignupAttemptEmail } from './send-signup-attempt-email-adapter.js'
import { createSendVerificationEmail } from './send-verification-email-adapter.js'

const makeTransport = () => ({ sendMail: vi.fn<EmailTransport['sendMail']>(async () => ({})) })
const sent = (transport: ReturnType<typeof makeTransport>) => transport.sendMail.mock.lastCall?.[0]
const appUrls = { ADMIN: 'https://admin.test/', CLIENT: 'https://client.test' }

describe('createSendVerificationEmail', () => {
  it('writes in Portuguese with a link to the client app', async () => {
    const transport = makeTransport()
    await createSendVerificationEmail(transport, 'f@e.com', 'https://client.test/')({
      to: 'ana@example.com',
      language: 'pt-BR',
      token: 'a+b',
    })
    expect(sent(transport)).toMatchObject({ from: 'f@e.com', to: 'ana@example.com', subject: 'Confirme seu email' })
    expect(sent(transport)?.text).toContain('https://client.test/verify-email?token=a%2Bb')
    expect(sent(transport)?.text).toContain('24 horas')
  })

  it('writes in English', async () => {
    const transport = makeTransport()
    await createSendVerificationEmail(transport, 'f@e.com', 'https://client.test')({
      to: 'ana@example.com',
      language: 'en',
      token: 't',
    })
    expect(sent(transport)?.subject).toBe('Confirm your email')
    expect(sent(transport)?.text).toContain('24 hours')
  })
})

describe('createSendSignupAttemptEmail', () => {
  it('links to the login and the password reset of the client app', async () => {
    const transport = makeTransport()
    const userType: UserType = 'CLIENT'
    await createSendSignupAttemptEmail(transport, 'f@e.com', appUrls)({ to: 'ana@example.com', language: 'en', userType })
    expect(sent(transport)?.subject).toBe('Sign-up attempt with your email')
    expect(sent(transport)?.text).toContain('https://client.test/login')
    expect(sent(transport)?.text).toContain('https://client.test/forgot-password')
  })

  it('links an administrator to the admin app, in Portuguese', async () => {
    const transport = makeTransport()
    const userType: UserType = 'ADMIN'
    await createSendSignupAttemptEmail(transport, 'f@e.com', appUrls)({ to: 'a@e.com', language: 'pt-BR', userType })
    expect(sent(transport)?.subject).toBe('Tentativa de cadastro com o seu email')
    expect(sent(transport)?.text).toContain('https://admin.test/login')
    expect(sent(transport)?.text).not.toContain('client.test')
  })
})
