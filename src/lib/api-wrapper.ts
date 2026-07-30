import { type ZodSchema } from 'zod'
import { verifyToken } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-errors'
import { apiRateLimit, rateLimit, getClientIp } from '@/lib/rate-limit'

interface AuthContext {
  userId: string
  email: string
  role: string
}

type AuthenticatedHandler = (
  request: Request,
  context: AuthContext
) => Promise<Response>

type ValidatedHandler<T = unknown> = (
  request: Request,
  validatedData: T
) => Promise<Response>

type RateLimitedHandler = (request: Request) => Promise<Response>

export function withAuth(handler: AuthenticatedHandler) {
  return async (request: Request): Promise<Response> => {
    try {
      const authHeader = request.headers.get('authorization')
      const cookieHeader = request.headers.get('cookie')

      let token: string | null = null

      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7)
      } else if (cookieHeader) {
        const tokenMatch = cookieHeader.match(/buildprop_token=([^;]+)/)
        if (tokenMatch) {
          token = tokenMatch[1]
        }
      }

      if (!token) {
        return Response.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const payload = verifyToken(token)
      if (!payload) {
        return Response.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        )
      }

      return await handler(request, {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      })
    } catch (error) {
      return handleApiError(error)
    }
  }
}

export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: ValidatedHandler<T>
) {
  return async (request: Request): Promise<Response> => {
    try {
      const body = await request.json()
      const validatedData = schema.parse(body)
      return await handler(request, validatedData)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

export function withRateLimit(
  maxRequests: number,
  windowMs: number,
  handler: RateLimitedHandler
) {
  return async (request: Request): Promise<Response> => {
    try {
      const ip = getClientIp(request)
      const result = rateLimit(`custom:${ip}`, maxRequests, windowMs)

      if (!result.allowed) {
        return Response.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
              'X-RateLimit-Limit': String(maxRequests),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
            },
          }
        )
      }

      const response = await handler(request)
      response.headers.set('X-RateLimit-Limit', String(maxRequests))
      response.headers.set('X-RateLimit-Remaining', String(result.remaining))
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)))

      return response
    } catch (error) {
      return handleApiError(error)
    }
  }
}

export function withApiRateLimit(handler: RateLimitedHandler) {
  return withRateLimit(100, 60_000, handler)
}

export function withAuthRateLimit(handler: RateLimitedHandler) {
  return withRateLimit(10, 60_000, handler)
}
