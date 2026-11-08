import { describe, expect, it } from 'vitest'
import {
  getNetworkPrefix,
  normalizeEmail,
  resolveLanguage,
  toLanguage,
  toPublicUser,
  toTheme,
  toUserType,
  type User,
} from './user-model.js'

describe('getNetworkPrefix', () => {
  it.each([
    ['203.0.113.98', '203.0.113'],
    ['::ffff:203.0.113.98', '203.0.113'],
    ['2001:db8:85a3:8d3:1319:8a2e:370:7348', '2001:db8:85a3'],
    ['2001:db8::1', '2001:db8:0'],
    ['::1', '0:0:0'],
  ])('reads %s', (ip, prefix) => {
    expect(getNetworkPrefix(ip)).toBe(prefix)
  })

  it.each([[undefined], [''], ['not-an-ip']])('returns null for %s', (ip) => {
    expect(getNetworkPrefix(ip)).toBeNull()
  })
})

it('reads stored values only when valid', () => {
  expect(toUserType('ADMIN')).toBe('ADMIN')
  expect(toUserType('CLIENT')).toBe('CLIENT')
  expect(() => toUserType('ROOT')).toThrow('Invalid user type')
  expect(toTheme('dark')).toBe('dark')
  expect(toTheme('light')).toBe('light')
  expect(toTheme('blue')).toBeNull()
  expect(toTheme(undefined)).toBeNull()
  expect(toLanguage('en')).toBe('en')
  expect(toLanguage('pt-BR')).toBe('pt-BR')
  expect(toLanguage('fr')).toBeNull()
  expect(toLanguage(null)).toBeNull()
})

it('normalizes emails', () => {
  expect(normalizeEmail('  Admin@Example.COM ')).toBe('admin@example.com')
})

it('prefers the saved language, then the requested one, then English', () => {
  expect(resolveLanguage('pt-BR', 'en')).toBe('pt-BR')
  expect(resolveLanguage(null, 'pt-BR')).toBe('pt-BR')
  expect(resolveLanguage(null)).toBe('en')
})

it('exposes only public fields', () => {
  const user: User = {
    id: '1',
    name: 'Ana',
    email: 'ana@example.com',
    passwordHash: 'secret',
    type: 'ADMIN',
    clubs: [{ id: 'c', name: 'Club' }],
    theme: 'dark',
    language: 'en',
    tokenVersion: 3,
    lockedUntil: null,
    knownNetworks: ['x'],
    emailVerifiedAt: null,
    verificationEmailSentAt: null,
    socialIdentities: [],
  }
  expect(toPublicUser(user)).toEqual({
    id: '1',
    name: 'Ana',
    email: 'ana@example.com',
    type: 'ADMIN',
    clubs: [{ id: 'c', name: 'Club' }],
    preferences: { theme: 'dark', language: 'en' },
  })
})
