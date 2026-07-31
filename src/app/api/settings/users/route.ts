export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-errors'
import { getCurrentUser } from '@/lib/current-user'
import { isAdminRole } from '@/lib/permissions'

// Guard: user management is Super Admin/Admin only.
async function requireAdmin(): Promise<Response | null> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return Response.json({ error: 'Authentication required' }, { status: 401 })
  if (!isAdminRole(currentUser.role.name)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

export async function GET() {
  try {
    const guard = await requireAdmin()
    if (guard) return guard

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const roles = await prisma.role.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { level: 'desc' },
    })

    return Response.json({ users, roles })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireAdmin()
    if (guard) return guard

    const body = await request.json()
    const { firstName, lastName, email, phone, roleId, password } = body

    if (!firstName || !lastName || !email || !roleId || !password) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return Response.json({ error: "A user with this email already exists" }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone: phone || null,
        roleId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
      },
    })

    return Response.json({ success: true, user })
  } catch (error) {
    return handleApiError(error)
  }
}
