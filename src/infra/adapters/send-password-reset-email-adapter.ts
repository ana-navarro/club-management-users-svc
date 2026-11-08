import type { Language } from '../../domain/models/user-model.js'
import type { SendPasswordResetEmailPort } from '../../domain/ports/auth-output-ports.js'
import { createResetLink, type AppUrls, type EmailTransport } from './create-email-link-adapter.js'

const TEXTS: Record<Language, { subject: string; body: (link: string) => string }> = {
  'pt-BR': {
    subject: 'Redefinição de senha',
    body: (link) =>
      `Recebemos um pedido para redefinir a sua senha.\n\nPara criar uma nova senha, acesse:\n${link}\n\nO link vale por 2 horas e funciona uma única vez. Se você não fez este pedido, ignore este email.`,
  },
  en: {
    subject: 'Password reset',
    body: (link) =>
      `We received a request to reset your password.\n\nTo create a new password, go to:\n${link}\n\nThe link is valid for 2 hours and works only once. If you did not make this request, ignore this email.`,
  },
}

export function createSendPasswordResetEmail(
  transport: EmailTransport,
  from: string,
  appUrls: AppUrls,
): SendPasswordResetEmailPort {
  return async ({ to, language, token, userType }) => {
    const texts = TEXTS[language]
    await transport.sendMail({ from, to, subject: texts.subject, text: texts.body(createResetLink(appUrls[userType], token)) })
  }
}
