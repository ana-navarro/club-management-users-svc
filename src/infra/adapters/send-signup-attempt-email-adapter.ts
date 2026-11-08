import type { Language } from '../../domain/models/user-model.js'
import type { SendSignupAttemptEmailPort } from '../../domain/ports/registration-output-ports.js'
import type { AppUrls, EmailTransport } from './create-email-link-adapter.js'

const TEXTS: Record<Language, { subject: string; body: (login: string, reset: string) => string }> = {
  'pt-BR': {
    subject: 'Tentativa de cadastro com o seu email',
    body: (login, reset) =>
      `Alguém tentou criar uma conta com o seu email, que já tem uma conta.\n\nPara entrar, acesse:\n${login}\n\nSe esqueceu a senha, peça uma nova em:\n${reset}\n\nSe não foi você, nada mudou na sua conta e você pode ignorar este email.`,
  },
  en: {
    subject: 'Sign-up attempt with your email',
    body: (login, reset) =>
      `Someone tried to create an account with your email, which already has an account.\n\nTo sign in, go to:\n${login}\n\nIf you forgot your password, request a new one at:\n${reset}\n\nIf this was not you, nothing changed in your account and you can ignore this email.`,
  },
}

export function createSendSignupAttemptEmail(
  transport: EmailTransport,
  from: string,
  appUrls: AppUrls,
): SendSignupAttemptEmailPort {
  return async ({ to, language, userType }) => {
    const texts = TEXTS[language]
    const appUrl = appUrls[userType].replace(/\/$/, '')
    await transport.sendMail({
      from,
      to,
      subject: texts.subject,
      text: texts.body(`${appUrl}/login`, `${appUrl}/forgot-password`),
    })
  }
}
