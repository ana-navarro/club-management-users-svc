import type { IncrementNetworkAttemptsPort } from '../../domain/ports/registration-output-ports.js'
import type { NetworkAttemptModel } from '../schemas/registration-attempts-schema.js'
import { isDuplicateKeyError } from './create-client-user-adapter.js'

const WINDOW_MS = 60 * 60 * 1000

// Shared by every limit per network. MongoDB deletes expired documents only every minute or so,
// so an expired window is restarted here instead of waiting for the TTL.
export function createIncrementNetworkAttempts(model: NetworkAttemptModel): IncrementNetworkAttemptsPort {
  const increment = async (networkHash: string, now: Date): Promise<number> => {
    const expiresAt = new Date(now.getTime() + WINDOW_MS)
    const restarted = await model
      .findOneAndUpdate(
        { networkHash: { $eq: networkHash }, expiresAt: { $lte: now } },
        { $set: { count: 1, expiresAt } },
        { returnDocument: 'after' },
      )
      .lean()
    if (restarted) return restarted.count

    const counted = await model
      .findOneAndUpdate(
        { networkHash: { $eq: networkHash } },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
        { upsert: true, returnDocument: 'after' },
      )
      .lean()
    return counted?.count ?? 1
  }

  return async (networkHash, now) => {
    try {
      return await increment(networkHash, now)
    } catch (error) {
      // Two first attempts at once: the loser of the insert counts on the document of the winner.
      if (error instanceof Error && isDuplicateKeyError(error)) return increment(networkHash, now)
      throw error
    }
  }
}
