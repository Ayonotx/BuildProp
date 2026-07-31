export const dynamic = 'force-dynamic'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { hashPassword } from '@/lib/auth-utils'
import { getCurrentUser } from '@/lib/current-user'
import { isAdminRole } from '@/lib/permissions'
import { handleApiError } from '@/lib/api-errors'
import { logAudit } from '@/lib/audit'

const updateUserSchema = z.object({
  firstName: z.string().min(1, 'First name must not be empty').max(100).optional(),
  lastName: z.string().min(1, 'Last name must not be empty').max(100).optional(),
  email: z.string().email('Invalid email format').optional(),
  roleId: z.string().min(1, 'Role is required').optional(),
  active: z.boolean().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
})

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  role: { select: { id: true, name: true } },
} as const

// Guard: the caller must be an authenticated Super Admin or Admin.
async function requireAdmin(): Promise<{ currentUser: Awaited<ReturnType<typeof getCurrentUser>>; response: Response | null }> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return { currentUser, response: Response.json({ error: 'Authentication required' }, { status: 401 }) }
  }
  if (!isAdminRole(currentUser.role.name)) {
    return { currentUser, response: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { currentUser, response: null }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { currentUser, response } = await requireAdmin()
    if (response) return response

    const { id } = await params
    const body = await request.json()
    const data = updateUserSchema.parse(body)

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    const update: Record<string, unknown> = {}

    if (data.firstName !== undefined) update.firstName = data.firstName
    if (data.lastName !== undefined) update.lastName = data.lastName

    if (data.email !== undefined) {
      const email = data.email.toLowerCase().trim()
      const duplicate = await prisma.user.findUnique({ where: { email } })
      if (duplicate && duplicate.id !== id) {
        return Response.json({ error: 'A user with this email already exists' }, { status: 409 })
      }
      update.email = email
    }

    if (data.roleId !== undefined) {
      // NOTE: Editing your own role is allowed (Super Admin/Admin may edit any
      // user). A Super Admin lowering their own role is their responsibility.
      const role = await prisma.role.findUnique({ where: { id: data.roleId } })
      if (!role) {
        return Response.json({ error: 'Invalid role' }, { status: 400 })
      }
      update.roleId = data.roleId
    }

    if (data.active !== undefined) {
      if (id === currentUser!.id && data.active === false) {
        return Response.json({ error: 'You cannot deactivate your own account' }, { status: 400 })
      }
      update.isActive = data.active
    }

    if (data.password !== undefined) {
      update.passwordHash = await hashPassword(data.password)
    }

    const user = await prisma.user.update({
      where: { id },
      data: update,
      select: userSelect,
    })

    await logAudit('user_update', 'users', `Updated user ${user.email}`, currentUser!.id)

    return Response.json({ success: true, user })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { currentUser, response } = await requireAdmin()
    if (response) return response

    const { id } = await params

    if (id === currentUser!.id) {
      return Response.json({ error: 'You cannot deactivate your own account' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    // Soft delete — preserve history/audit trails.
    await prisma.user.update({ where: { id }, data: { isActive: false } })
    await logAudit('user_deactivate', 'users', `Deactivated user ${target.email}`, currentUser!.id)

    return Response.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
