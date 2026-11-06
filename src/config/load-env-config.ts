export type EnvConfig = { port: number }

const DEFAULT_PORT = 3001

export function loadEnvConfig(env: NodeJS.ProcessEnv): EnvConfig {
  return { port: env.PORT ? Number(env.PORT) : DEFAULT_PORT }
}
