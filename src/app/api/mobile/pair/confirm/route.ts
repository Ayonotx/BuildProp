export const dynamic = 'force-dynamic'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withValidation } from '@/lib/api-wrapper'
import { generateToken } from '@/lib/auth-utils'
import { consumePairing } from '@/lib/pairing'

const confirmSchema = z.object({
  token: z.string().min(1, 'Pairing token is required'),
})

/**
 * Exchanges a scanned QR pairing token for a mobile JWT. Public endpoint
 * (see PUBLIC_PATHS in src/proxy.ts) — no auth required, the QR token IS
 * the credential. Single-use and expires after 5 minutes (created via
 * createPairing in src/lib/pairing.ts).
 *
 * Body:  { token }
 * Reply: { success, token: <jwt>, user: { id, email, firstName, lastName, role: { name } } }
 */
export const POST = withValidation(confirmSchema, async (_request, body) => {
  const pairing = await consumePairing(body.token)

  if (!pairing) {
    return Response.json(
      { error: 'This pairing code is invalid or has expired. Please generate a new QR code in BuildProp.' },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: pairing.userId },
    include: { role: true },
  })

  if (!user || !user.isActive) {
    return Response.json({ error: 'User not found or account deactivated.' }, { status: 401 })
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role.name,
  })

  return Response.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: { name: user.role.name },
    },
  })
})
