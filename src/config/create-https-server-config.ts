import { createServer, type Server } from 'node:https'
import type { Express } from 'express'

export type TlsFiles = { ca: string | Buffer; cert: string | Buffer; key: string | Buffer }

export function createHttpsServer(app: Express, tls: TlsFiles): Server {
  return createServer(
    {
      ca: tls.ca,
      cert: tls.cert,
      key: tls.key,
      // mTLS: callers without a certificate from the private authority are refused.
      requestCert: true,
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    },
    app,
  )
}
