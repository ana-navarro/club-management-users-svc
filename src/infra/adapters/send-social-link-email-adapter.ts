import type { Language } from '../../domain/models/user-model.js'
import type { SendSocialLinkEmailPort } from '../../domain/ports/social-login-output-ports.js'
import { createAppLink, type EmailTransport } from './create-email-link-adapter.js'

const TEXTS: Record<Language, { subject: string; body: (profile: string, link: string) => string }> = {
  'pt-BR': {
    subject: 'Confirme a entrada com o Facebook',
    body: (profile, link) =>
      `Alguém pediu para entrar no sistema com o perfil do Facebook "${profile}", que usa este email.\n\nSe foi você, confirme em:\n${link}\n\nO link vale por 24 horas e funciona uma única vez. Nada é ligado à sua conta sem essa confirmação. Se não foi você ou não reconhece esse perfil, ignore este email ou escolha "Não fui eu" na página do link.`,
  },
  en: {
    subject: 'Confirm the sign-in with Facebook',
    body: (profile, link) =>
      `Someone asked to sign in with the Facebook profile "${profile}", which uses this email.\n\nIf this was you, confirm at:\n${link}\n\nThe link is valid for 24 hours and works only once. Nothing is linked to your account without this confirmation. If this was not you or you do not recognize this profile, ignore this email or choose "This was not me" on the link page.`,
  },
}

const MAXIMUM_PROFILE_LENGTH = 100

export function createSendSocialLinkEmail(
  transport: EmailTransport,
  from: string,
  clientAppUrl: string,
): SendSocialLinkEmailPort {
  return async ({ to, language, token, profileName }) => {
    const texts = TEXTS[language]
    // Plain text only, so the name cannot inject markup. Line breaks are flattened.
    const profile = profileName.replace(/\s+/g, ' ').trim().slice(0, MAXIMUM_PROFILE_LENGTH) || 'Facebook'
    await transport.sendMail({
      from,
      to,
      subject: texts.subject,
      text: texts.body(profile, createAppLink(clientAppUrl, '/confirm-social-link', token)),
    })
  }
}
