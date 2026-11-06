import { z } from 'zod'

export const getHealthResponseDto = z.object({ status: z.literal('ok') })
