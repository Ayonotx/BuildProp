export const dynamic = 'force-dynamic'

import { handleApiError } from '@/lib/api-errors'
import { loadEmailSettings, saveEmailSettings } from '@/lib/email'
import { logAudit } from '@/lib/audit'
import { getCurrentUser } from '@/lib/current-user'
import { isAdminRole } from '@/lib/permissions'

/**
 * Removes the stored Google OAuth tokens from data/email.json (existing SMTP
 * settings are preserved). Auth required (Super Admin / Admin).
 */
export async function POST() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (!isAdminRole(currentUser.role.name)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await loadEmailSettings()
    await saveEmailSettings({
      ...existing,
      emailProvider: existing.host ? 'smtp' : '',
      googleClientId: '',
      googleClientSecret: '',
      googleRefreshToken: '',
      googleAccessToken: '',
      googleTokenExpiresAt: 0,
      googleEmail: '',
    })

    try {
      await logAudit('email_google_disconnect', 'settings', 'Google Gmail connection removed', currentUser.id)
    } catch {}

    return Response.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
