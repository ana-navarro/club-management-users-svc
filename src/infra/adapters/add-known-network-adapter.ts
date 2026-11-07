import type { AddKnownNetworkPort } from '../../domain/ports/auth-output-ports.js'
import { UserModel } from '../schemas/users-schema.js'

const MAXIMUM_KNOWN_NETWORKS = 20

export const addKnownNetwork: AddKnownNetworkPort = async (id, networkHash) => {
  await UserModel.updateOne(
    { _id: id, knownNetworks: { $ne: networkHash } },
    { $push: { knownNetworks: { $each: [networkHash], $slice: -MAXIMUM_KNOWN_NETWORKS } } },
  )
}
