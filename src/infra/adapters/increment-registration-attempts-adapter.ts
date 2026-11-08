import { RegistrationAttemptModel } from '../schemas/registration-attempts-schema.js'
import { createIncrementNetworkAttempts } from './increment-network-attempts-adapter.js'

export const incrementRegistrationAttempts = createIncrementNetworkAttempts(RegistrationAttemptModel)
