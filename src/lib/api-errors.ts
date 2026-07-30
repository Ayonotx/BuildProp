import { z } from 'zod'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleApiError(error: unknown): Response {
  if (error instanceof z.ZodError) {
    const messages = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
    console.error('[Validation Error]', messages)
    return Response.json(
      { error: 'Validation failed', details: messages },
      { status: 400 }
    )
  }

  if (error instanceof ApiError) {
    return Response.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  console.error('[API Error]', error)
  return Response.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
