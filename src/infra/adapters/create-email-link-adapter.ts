import type { UserType } from '../../domain/models/user-model.js'

// Each email links to the system of the account type (research R12).
export type AppUrls = Record<UserType, string>

export function createAppLink(appUrl: string, path: string, token: string): string {
  return `${appUrl.replace(/\/$/, '')}${path}?token=${encodeURIComponent(token)}`
}

export type EmailMessage = { from: string; to: string; subject: string; text: string }

export type EmailTransport = { sendMail(message: EmailMessage): Promise<object> }

export function createResetLink(appUrl: string, token: string): string {
  return createAppLink(appUrl, '/forgot-password', token)
}
