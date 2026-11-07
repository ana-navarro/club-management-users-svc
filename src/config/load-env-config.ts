export type EnvConfig = {
  port: number
  appUrl: string
  databaseUrl: string
  databaseName: string
  jwtSecret: string
  smtp: { host: string; port: number; requireTls: boolean; user?: string; password?: string; from: string }
  tls: { ca: string; cert: string; key: string }
}

const DEFAULT_PORT = 3001

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
    appUrl: required('APP_URL'),
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
  }

  if (missing.length > 0) throw new Error(`Missing environment variables: ${missing.join(', ')}`)
  return config
}
