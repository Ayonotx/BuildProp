export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { hashPassword, verifyPassword } from '@/lib/auth-utils'
import { getCurrentUser } from '@/lib/current-user'
import { handleApiError } from '@/lib/api-errors'
import { logAudit } from '@/lib/audit'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const data = changePasswordSchema.parse(body)

    const isValid = await verifyPassword(data.currentPassword, currentUser.passwordHash)
    if (!isValid) {
      return Response.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    const passwordHash = await hashPassword(data.newPassword)
    await prisma.user.update({
      where: { id: currentUser.id },
      data: { passwordHash },
    })

    await logAudit('password_change', 'auth', 'User changed their password', currentUser.id)

    return Response.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
