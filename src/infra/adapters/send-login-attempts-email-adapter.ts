import type { Language } from '../../domain/models/user-model.js'
import type { SendLoginAttemptsEmailPort } from '../../domain/ports/auth-output-ports.js'
import { createResetLink, type EmailTransport } from './create-email-link-adapter.js'

const TEXTS: Record<Language, { subject: string; body: (attempts: number, link: string) => string }> = {
  'pt-BR': {
    subject: 'Tentativas de acesso à sua conta',
    body: (attempts, link) =>
      `Detectamos ${attempts} tentativas de acesso à sua conta com a senha errada. Por segurança, o login ficou bloqueado por 15 minutos.\n\nSe foi você e deseja mudar a senha, acesse:\n${link}\n\nO link vale por 2 horas e funciona uma única vez. Se você não quiser mudar a senha, ignore este email.`,
  },
  en: {
    subject: 'Sign-in attempts on your account',
    body: (attempts, link) =>
      `We detected ${attempts} attempts to sign in to your account with the wrong password. For security, sign-in is locked for 15 minutes.\n\nIf you want to change your password, go to:\n${link}\n\nThe link is valid for 2 hours and works only once. If you do not want to change your password, ignore this email.`,
  },
}

export function createSendLoginAttemptsEmail(
  transport: EmailTransport,
  from: string,
  appUrl: string,
): SendLoginAttemptsEmailPort {
  return async ({ to, language, token, attempts }) => {
    const texts = TEXTS[language]
    await transport.sendMail({
      from,
      to,
      subject: texts.subject,
      text: texts.body(attempts, createResetLink(appUrl, token)),
    })
  }
}
