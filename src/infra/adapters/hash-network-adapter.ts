import { createHmac } from 'node:crypto'
import type { HashNetworkPort } from '../../domain/ports/auth-output-ports.js'

// Keyed, because the few possible prefixes would be easy to reverse from a plain hash.
export function createHashNetwork(secret: string): HashNetworkPort {
  return (prefix) => createHmac('sha256', secret).update(prefix).digest('hex')
}
