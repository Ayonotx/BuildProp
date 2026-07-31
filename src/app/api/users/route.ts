export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { hashPassword } from '@/lib/auth-utils'
import { getCurrentUser } from '@/lib/current-user'
import { isAdminRole } from '@/lib/permissions'
import { handleApiError } from '@/lib/api-errors'
import { logAudit } from '@/lib/audit'

const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name must be under 100 characters'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name must be under 100 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleId: z.string().min(1, 'Role is required'),
  active: z.boolean().optional(),
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
// Returns the current user, or an error Response to return immediately.
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

export async function GET() {
  try {
    const { response } = await requireAdmin()
    if (response) return response

    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: { createdAt: 'desc' },
    })

    return Response.json({ users })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const { currentUser, response } = await requireAdmin()
    if (response) return response

    const body = await request.json()
    const data = createUserSchema.parse(body)

    const email = data.email.toLowerCase().trim()
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return Response.json({ error: 'A user with this email already exists' }, { status: 409 })
    }

    const role = await prisma.role.findUnique({ where: { id: data.roleId } })
    if (!role) {
      return Response.json({ error: 'Invalid role' }, { status: 400 })
    }

    const passwordHash = await hashPassword(data.password)
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email,
        passwordHash,
        roleId: data.roleId,
        isActive: data.active ?? true,
      },
      select: userSelect,
    })

    await logAudit('user_create', 'users', `Created user ${email} with role ${role.name}`, currentUser!.id)

    return Response.json({ success: true, user })
  } catch (error) {
    return handleApiError(error)
  }
}
