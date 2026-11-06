import { createApp } from './config/create-app-config.js'
import { loadEnvConfig } from './config/load-env-config.js'

const { port } = loadEnvConfig(process.env)

createApp().listen(port, () => {
  console.log(`club-management-users-svc listening on port ${port}`)
})
