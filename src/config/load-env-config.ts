export type GoogleConfig = {
  clientId: string
  clientSecret: string
  authorizeUrl: string
  tokenUrl: string
  jwksUrl: string
  issuers: string[]
}

export type FacebookConfig = {
  appId: string
  appSecret: string
  authorizeUrl: string
  graphUrl: string
  graphVersion: string
  scope: string
}

export type EnvConfig = {
  port: number
  adminAppUrl: string
  clientAppUrl: string
  databaseUrl: string
  databaseName: string
  jwtSecret: string
  smtp: { host: string; port: number; requireTls: boolean; user?: string; password?: string; from: string }
  tls: { ca: string; cert: string; key: string }
  // null when the provider has no credentials: its button answers provider_unavailable.
  google: GoogleConfig | null
  facebook: FacebookConfig | null
}

const DEFAULT_PORT = 3001
const DEFAULT_FACEBOOK_GRAPH_VERSION = 'v23.0'

function loadGoogle(env: NodeJS.ProcessEnv): GoogleConfig | null {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    authorizeUrl: env.GOOGLE_AUTHORIZE_URL || 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token',
    jwksUrl: env.GOOGLE_JWKS_URL || 'https://www.googleapis.com/oauth2/v3/certs',
    issuers: (env.GOOGLE_ISSUERS || 'https://accounts.google.com,accounts.google.com')
      .split(',')
      .map((issuer) => issuer.trim())
      .filter(Boolean),
  }
}

function loadFacebook(env: NodeJS.ProcessEnv): FacebookConfig | null {
  if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET) return null
  const graphVersion = env.FACEBOOK_GRAPH_VERSION || DEFAULT_FACEBOOK_GRAPH_VERSION
  return {
    appId: env.FACEBOOK_APP_ID,
    appSecret: env.FACEBOOK_APP_SECRET,
    authorizeUrl: env.FACEBOOK_AUTHORIZE_URL || `https://www.facebook.com/${graphVersion}/dialog/oauth`,
    graphUrl: env.FACEBOOK_GRAPH_URL || 'https://graph.facebook.com',
    graphVersion,
    scope: env.FACEBOOK_SCOPE || 'email,public_profile',
  }
}

export function loadEnvConfig(env: NodeJS.ProcessEnv): EnvConfig {
  const missing: string[] = []
  const required = (name: string): string => {
    const value = env[name]
    if (value) return value
    missing.push(name)
    return ''
  }

  const config: EnvConfig = {
    port: env.PORT ? Number(env.PORT) : DEFAULT_PORT,
    adminAppUrl: required('ADMIN_APP_URL'),
    clientAppUrl: required('CLIENT_APP_URL'),
    databaseUrl: required('DATABASE_URL'),
    databaseName: required('DATABASE_NAME'),
    jwtSecret: required('JWT_SECRET'),
    smtp: {
      host: required('SMTP_HOST'),
      port: Number(required('SMTP_PORT')),
      requireTls: env.SMTP_REQUIRE_TLS === 'true',
      user: env.SMTP_USER || undefined,
      password: env.SMTP_PASSWORD || undefined,
      from: required('SMTP_FROM'),
    },
    tls: { ca: required('TLS_CA'), cert: required('TLS_CERT'), key: required('TLS_KEY') },
    google: loadGoogle(env),
    facebook: loadFacebook(env),
  }

  if (missing.length > 0) throw new Error(`Missing environment variables: ${missing.join(', ')}`)
  return config
}
