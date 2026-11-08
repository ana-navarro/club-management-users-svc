import { describe, expect, it, vi } from 'vitest'
import { InvalidSocialLinkError } from '../models/auth-errors-model.js'
import { makeUser } from '../models/user-model.mock.js'
import { ConfirmSocialLinkUsecase } from './confirm-social-link-usecase.js'
import { DeclineSocialLinkUsecase } from './decline-social-link-usecase.js'
import { PreviewSocialLinkUsecase } from './preview-social-link-usecase.js'
import { NOW, client, linkRequest, makeConfirmDeps, makeUserStore } from './social-login-fakes.mock.js'

const facebookOf = (user: { socialIdentities: { provider: string; subject: string }[] } | undefined) =>
  user?.socialIdentities.filter((identity) => identity.provider === 'facebook').map((identity) => identity.subject)

describe('PreviewSocialLinkUsecase', () => {
  it('shows the provider, the profile name and the email, without changing anything', async () => {
    const find = vi.fn(async () => linkRequest())
    const usecase = new PreviewSocialLinkUsecase({ hashValue: (value) => `hash:${value}`, findSocialLinkRequest: find, now: () => NOW })
    await expect(usecase.execute({ token: 't' })).resolves.toEqual({
      provider: 'facebook',
      profileName: 'Ana FB',
      email: 'ana@example.com',
    })
    expect(find).toHaveBeenCalledWith('hash:t', NOW)
  })

  it('refuses an expired, used or declined link', async () => {
    const usecase = new PreviewSocialLinkUsecase({
      hashValue: (value) => value,
      findSocialLinkRequest: vi.fn(async () => null),
      now: () => NOW,
    })
    await expect(usecase.execute({ token: 't' })).rejects.toThrow(InvalidSocialLinkError)
  })
})

describe('ConfirmSocialLinkUsecase', () => {
  it('creates a confirmed client without password in the language of the request', async () => {
    const store = makeUserStore()
    await new ConfirmSocialLinkUsecase(makeConfirmDeps(store)).execute({ token: 't' })
    const [created] = store.users.values()
    expect(created).toMatchObject({
      email: 'ana@example.com',
      name: 'Ana FB',
      type: 'CLIENT',
      passwordHash: null,
      emailVerifiedAt: NOW,
      language: 'en',
    })
    expect(facebookOf(created)).toEqual(['f1'])
  })

  it('links a confirmed client, keeping the password', async () => {
    const store = makeUserStore([client({ email: 'ana@example.com' })])
    await new ConfirmSocialLinkUsecase(makeConfirmDeps(store)).execute({ token: 't' })
    expect(facebookOf(store.users.get('u1'))).toEqual(['f1'])
    expect(store.users.get('u1')?.passwordHash).toBe('hash')
  })

  it('claims an unconfirmed client and invalidates its pending links', async () => {
    const store = makeUserStore([client({ email: 'ana@example.com', emailVerifiedAt: null })])
    await new ConfirmSocialLinkUsecase(makeConfirmDeps(store)).execute({ token: 't' })
    expect(store.users.get('u1')).toMatchObject({ emailVerifiedAt: NOW, passwordHash: null })
    expect(store.invalidateEmailVerificationTokens).toHaveBeenCalledWith('u1', NOW)
    expect(store.invalidatePasswordResetTokens).toHaveBeenCalledWith('u1', NOW)
  })

  it('replaces another Facebook profile already linked to the account', async () => {
    const linked = client({
      email: 'ana@example.com',
      socialIdentities: [
        { provider: 'facebook', subject: 'old', linkedAt: NOW },
        { provider: 'google', subject: 'g1', linkedAt: NOW },
      ],
    })
    const store = makeUserStore([linked])
    await new ConfirmSocialLinkUsecase(makeConfirmDeps(store)).execute({ token: 't' })
    expect(facebookOf(store.users.get('u1'))).toEqual(['f1'])
    expect(store.users.get('u1')?.socialIdentities).toHaveLength(2)
  })

  it('accepts a confirmation of the identity already linked to the account', async () => {
    const linked = client({ email: 'ana@example.com', socialIdentities: [{ provider: 'facebook', subject: 'f1', linkedAt: NOW }] })
    const store = makeUserStore([linked])
    await expect(new ConfirmSocialLinkUsecase(makeConfirmDeps(store)).execute({ token: 't' })).resolves.toBeUndefined()
    expect(store.replaceSocialIdentity).not.toHaveBeenCalled()
  })

  it('refuses an expired, used or declined link', async () => {
    const store = makeUserStore()
    await expect(new ConfirmSocialLinkUsecase(makeConfirmDeps(store, null)).execute({ token: 't' })).rejects.toThrow(
      InvalidSocialLinkError,
    )
    expect(store.users.size).toBe(0)
  })

  it('refuses an email that now belongs to an administrator', async () => {
    const store = makeUserStore([makeUser({ id: 'a1', type: 'ADMIN' })])
    await expect(new ConfirmSocialLinkUsecase(makeConfirmDeps(store)).execute({ token: 't' })).rejects.toThrow(
      InvalidSocialLinkError,
    )
    expect(store.users.get('a1')?.socialIdentities).toEqual([])
  })

  it('refuses an identity linked to another account in the meantime', async () => {
    const elsewhere = client({
      id: 'u2',
      email: 'other@example.com',
      socialIdentities: [{ provider: 'facebook', subject: 'f1', linkedAt: NOW }],
    })
    const store = makeUserStore([client({ email: 'ana@example.com' }), elsewhere])
    await expect(new ConfirmSocialLinkUsecase(makeConfirmDeps(store)).execute({ token: 't' })).rejects.toThrow(
      InvalidSocialLinkError,
    )
    expect(facebookOf(store.users.get('u1'))).toEqual([])
  })

  it('rethrows unexpected failures', async () => {
    const store = makeUserStore()
    store.findUserByEmail.mockRejectedValue(new Error('database down'))
    await expect(new ConfirmSocialLinkUsecase(makeConfirmDeps(store)).execute({ token: 't' })).rejects.toThrow(
      'database down',
    )
  })
})

describe('DeclineSocialLinkUsecase', () => {
  it('spends the link and links nothing, for any token', async () => {
    const consume = vi.fn(async () => null)
    const usecase = new DeclineSocialLinkUsecase({ hashValue: (value) => `hash:${value}`, consumeSocialLinkRequest: consume, now: () => NOW })
    await expect(usecase.execute({ token: 't' })).resolves.toBeUndefined()
    expect(consume).toHaveBeenCalledWith('hash:t', NOW)
  })
})
