export type EmailMessage = { from: string; to: string; subject: string; text: string }

export type EmailTransport = { sendMail(message: EmailMessage): Promise<object> }

export function createResetLink(appUrl: string, token: string): string {
  return `${appUrl.replace(/\/$/, '')}/forgot-password?token=${encodeURIComponent(token)}`
}
