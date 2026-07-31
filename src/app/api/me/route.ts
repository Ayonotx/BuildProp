export const dynamic = 'force-dynamic'
import { getCurrentUser } from '@/lib/current-user'
import { getUserPermissions } from '@/lib/permissions'
import { handleApiError } from '@/lib/api-errors'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    const permissions = await getUserPermissions(user.roleId)

    return Response.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: { id: user.roleId, name: user.role.name },
        active: user.isActive,
      },
      permissions,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
