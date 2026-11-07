export type UserType = 'ADMIN' | 'CLIENT'
export type Theme = 'light' | 'dark'
export type Language = 'pt-BR' | 'en'

export type Club = { id: string; name: string }

export type User = {
  id: string
  name: string
  email: string
  passwordHash: string
  type: UserType
  clubs: Club[]
  theme: Theme | null
  language: Language | null
  tokenVersion: number
  lockedUntil: Date | null
  knownNetworks: string[]
}

export type PublicUser = {
  id: string
  name: string
  email: string
  type: UserType
  clubs: Club[]
  preferences: { theme: Theme | null; language: Language | null }
}

export const MINIMUM_PASSWORD_LENGTH = 8
export const MAXIMUM_LOGIN_ATTEMPTS = 3
export const LOGIN_LOCK_MINUTES = 15
export const MAXIMUM_PASSWORD_RESET_REQUESTS = 5
export const PASSWORD_RESET_LINK_HOURS = 2

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    type: user.type,
    clubs: user.clubs,
    preferences: { theme: user.theme, language: user.language },
  }
}

export function toUserType(value: string): UserType {
  if (value === 'ADMIN' || value === 'CLIENT') return value
  throw new Error('Invalid user type')
}

export function toTheme(value: string | null | undefined): Theme | null {
  return value === 'light' || value === 'dark' ? value : null
}

export function toLanguage(value: string | null | undefined): Language | null {
  return value === 'pt-BR' || value === 'en' ? value : null
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function resolveLanguage(saved: Language | null, requested?: Language): Language {
  return saved ?? requested ?? 'en'
}

// Identifies a network by the start of the address: 3 blocks in IPv4 and 3 groups in IPv6.
export function getNetworkPrefix(ip: string | undefined): string | null {
  if (!ip) return null
  const address = ip.trim().toLowerCase().replace(/^::ffff:(?=\d+\.)/, '')
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(address)) {
    return address.split('.').slice(0, 3).join('.')
  }
  if (!address.includes(':')) return null
  const [head = '', tail] = address.split('::')
  const headGroups = head ? head.split(':') : []
  const tailGroups = tail ? tail.split(':') : []
  const missing = 8 - headGroups.length - tailGroups.length
  const groups = [...headGroups, ...Array<string>(Math.max(missing, 0)).fill('0'), ...tailGroups]
  return groups
    .slice(0, 3)
    .map((group) => group.replace(/^0+(?=.)/, ''))
    .join(':')
}
