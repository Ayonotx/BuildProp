export const dynamic = 'force-dynamic'
import { handleApiError } from '@/lib/api-errors'
import { createPairing } from '@/lib/pairing'
import { logAudit } from '@/lib/audit'
import { getCurrentUser } from '@/lib/current-user'
import { isAdminRole } from '@/lib/permissions'

export async function POST() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (!isAdminRole(currentUser.role.name)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const session = await createPairing(currentUser.id)

    try {
      await logAudit('mobile_pair_start', 'settings', 'Mobile pairing QR code generated', currentUser.id)
    } catch {}

    return Response.json({ token: session.token, expiresAt: session.expiresAt })
  } catch (error) {
    return handleApiError(error)
  }
}
