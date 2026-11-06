import { readFileSync } from 'node:fs'
import { createApp, createUsecases } from './config/create-app-config.js'
import { connectDatabase } from './config/create-database-config.js'
import { createHttpsServer } from './config/create-https-server-config.js'
import { loadEnvConfig } from './config/load-env-config.js'

const config = loadEnvConfig(process.env)

await connectDatabase(config.databaseUrl, config.databaseName)

const server = createHttpsServer(createApp(await createUsecases(config)), {
  ca: readFileSync(config.tls.ca),
  cert: readFileSync(config.tls.cert),
  key: readFileSync(config.tls.key),
})

server.listen(config.port, () => {
  console.log(`club-management-users-svc listening on port ${config.port}`)
})
