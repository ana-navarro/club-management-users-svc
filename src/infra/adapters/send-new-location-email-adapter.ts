import type { Language } from '../../domain/models/user-model.js'
import type { SendNewLocationEmailPort } from '../../domain/ports/auth-output-ports.js'
import { createResetLink, type EmailTransport } from './create-email-link-adapter.js'

const MAXIMUM_USER_AGENT_LENGTH = 200

const TEXTS: Record<Language, { subject: string; unknown: string; body: (when: string, browser: string, link: string) => string }> = {
  'pt-BR': {
    subject: 'Novo acesso à sua conta',
    unknown: 'desconhecido',
    body: (when, browser, link) =>
      `Sua conta foi acessada de um local que não reconhecemos.\n\nData e hora: ${when} (UTC)\nNavegador: ${browser}\n\nSe foi você, não é preciso fazer nada. Se não foi, mude a sua senha:\n${link}\n\nO link vale por 2 horas e funciona uma única vez.`,
  },
  en: {
    subject: 'New sign-in to your account',
    unknown: 'unknown',
    body: (when, browser, link) =>
      `Your account was accessed from a location we do not recognize.\n\nDate and time: ${when} (UTC)\nBrowser: ${browser}\n\nIf this was you, there is nothing to do. If not, change your password:\n${link}\n\nThe link is valid for 2 hours and works only once.`,
  },
}

export function createSendNewLocationEmail(
  transport: EmailTransport,
  from: string,
  appUrl: string,
): SendNewLocationEmailPort {
  return async ({ to, language, token, when, userAgent }) => {
    const texts = TEXTS[language]
    const formatted = when.toLocaleString(language, { timeZone: 'UTC' })
    const browser = userAgent?.slice(0, MAXIMUM_USER_AGENT_LENGTH) || texts.unknown
    await transport.sendMail({
      from,
      to,
      subject: texts.subject,
      text: texts.body(formatted, browser, createResetLink(appUrl, token)),
    })
  }
}
