import type { Language } from '../../domain/models/user-model.js'
import type { SendVerificationEmailPort } from '../../domain/ports/registration-output-ports.js'
import { createAppLink, type EmailTransport } from './create-email-link-adapter.js'

const TEXTS: Record<Language, { subject: string; body: (link: string) => string }> = {
  'pt-BR': {
    subject: 'Confirme seu email',
    body: (link) =>
      `Recebemos o cadastro da sua conta.\n\nPara confirmar o seu email e começar a usar o sistema, acesse:\n${link}\n\nO link vale por 24 horas e funciona uma única vez. Se você não fez este cadastro, ignore este email.`,
  },
  en: {
    subject: 'Confirm your email',
    body: (link) =>
      `We received the sign-up of your account.\n\nTo confirm your email and start using the system, go to:\n${link}\n\nThe link is valid for 24 hours and works only once. If you did not sign up, ignore this email.`,
  },
}

// Only client accounts sign up, so the link always opens the client app.
export function createSendVerificationEmail(
  transport: EmailTransport,
  from: string,
  clientAppUrl: string,
): SendVerificationEmailPort {
  return async ({ to, language, token }) => {
    const texts = TEXTS[language]
    await transport.sendMail({
      from,
      to,
      subject: texts.subject,
      text: texts.body(createAppLink(clientAppUrl, '/verify-email', token)),
    })
  }
}
