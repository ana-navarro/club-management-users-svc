import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import type { Server } from 'node:https'
import forge from 'node-forge'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { makeApp } from '../application/routes/test-app.mock.js'
import { createHttpsServer } from './create-https-server-config.js'

type Pair = { cert: string; key: string }

const issue = (commonName: string, issuer?: { cert: forge.pki.Certificate; key: forge.pki.rsa.PrivateKey }) => {
  const keys = forge.pki.rsa.generateKeyPair(2048)
  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(8)).replace(/^[89a-f]/, '1')
  cert.validity.notBefore = new Date(Date.now() - 60000)
  cert.validity.notAfter = new Date(Date.now() + 3600000)
  cert.setSubject([{ name: 'commonName', value: commonName }])
  cert.setIssuer(issuer ? issuer.cert.subject.attributes : [{ name: 'commonName', value: commonName }])
  cert.setExtensions(
    issuer
      ? [
          { name: 'basicConstraints', cA: false },
          { name: 'extKeyUsage', serverAuth: true, clientAuth: true },
          { name: 'subjectAltName', altNames: [{ type: 7, ip: '127.0.0.1' }] },
        ]
      : [
          { name: 'basicConstraints', cA: true },
          { name: 'keyUsage', keyCertSign: true },
        ],
  )
  cert.sign(issuer ? issuer.key : keys.privateKey, forge.md.sha256.create())
  return { cert, key: keys.privateKey }
}

const toPem = ({ cert, key }: ReturnType<typeof issue>): Pair => ({
  cert: forge.pki.certificateToPem(cert),
  key: forge.pki.privateKeyToPem(key),
})

describe('createHttpsServer', () => {
  let server: Server
  let port: number
  let ca: string
  let client: Pair
  let stranger: Pair

  const call = (identity?: Pair) =>
    new Promise<number>((resolve, reject) => {
      httpsRequest(
        { host: '127.0.0.1', port, path: '/health', ca, cert: identity?.cert, key: identity?.key },
        (response) => {
          response.resume()
          resolve(response.statusCode ?? 0)
        },
      )
        .on('error', reject)
        .end()
    })

  beforeAll(() => {
    const authority = issue('test-authority')
    const otherAuthority = issue('other-authority')
    ca = forge.pki.certificateToPem(authority.cert)
    client = toPem(issue('admin-bff', authority))
    stranger = toPem(issue('stranger', otherAuthority))
    server = createHttpsServer(makeApp(), { ca, ...toPem(issue('users-svc', authority)) })
    return new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address()
        if (address === null || typeof address === 'string') throw new Error('Expected a TCP address')
        port = address.port
        resolve()
      })
    })
  }, 60000)

  afterAll(() => {
    server.close()
  })

  it('accepts a caller with a certificate from the authority', async () => {
    await expect(call(client)).resolves.toBe(200)
  })

  it('refuses a caller without a certificate', async () => {
    await expect(call()).rejects.toThrow()
  })

  it('refuses a certificate from another authority', async () => {
    await expect(call(stranger)).rejects.toThrow()
  })

  it('refuses plain HTTP', async () => {
    await expect(
      new Promise((resolve, reject) => {
        httpRequest({ host: '127.0.0.1', port, path: '/health' }, resolve).on('error', reject).end()
      }),
    ).rejects.toThrow()
  })
})
