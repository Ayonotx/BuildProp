export const dynamic = 'force-dynamic'

import { handleApiError } from '@/lib/api-errors'
import { buildGoogleAuthUrl } from '@/lib/email'
import { getCurrentUser } from '@/lib/current-user'
import { isAdminRole } from '@/lib/permissions'

/**
 * Returns the Google OAuth authorization URL for the Gmail sign-in flow.
 * Auth required (Super Admin / Admin). The caller opens the URL in a new
 * window; Google redirects back to /api/email/oauth/callback (public).
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (!isAdminRole(currentUser.role.name)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = buildGoogleAuthUrl()
    if (!url) {
      return Response.json({ error: 'Google sign-in is not configured.' }, { status: 400 })
    }

    return Response.json({ url })
  } catch (error) {
    return handleApiError(error)
  }
}
