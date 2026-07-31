export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/current-user'
import { handleApiError } from '@/lib/api-errors'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    const roles = await prisma.role.findMany({
      select: { id: true, name: true, description: true, level: true },
      orderBy: { level: 'desc' },
    })

    return Response.json({ roles })
  } catch (error) {
    return handleApiError(error)
  }
}
