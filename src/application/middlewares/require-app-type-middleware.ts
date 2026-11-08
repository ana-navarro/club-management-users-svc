import type { NextFunction, Request, Response } from 'express'
import type { UserType } from '../../domain/models/user-model.js'

export type AppTypeLocals = { appType: UserType }

// Only the BFFs reach this service, over mTLS, so the header says which system is calling (research R11).
export function requireAppType(request: Request, response: Response<object, AppTypeLocals>, next: NextFunction): void {
  const value = request.get('x-app-type')
  if (value !== 'ADMIN' && value !== 'CLIENT') {
    response.status(400).json({ error: 'invalid_request' })
    return
  }
  response.locals.appType = value
  next()
}
