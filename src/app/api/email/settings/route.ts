export const dynamic = 'force-dynamic'
import { withValidation } from '@/lib/api-wrapper'
import { handleApiError } from '@/lib/api-errors'
import { emailSettingsSchema } from '@/lib/validations'
import {
  loadEmailSettings,
  saveEmailSettings,
  sanitizeEmailSettings,
  isEmailConfigured,
  defaultPortFor,
  type EmailSettings,
} from '@/lib/email'
import { logAudit } from '@/lib/audit'
import { getCurrentUser } from '@/lib/current-user'
import { isAdminRole } from '@/lib/permissions'

// The app proxy (src/proxy.ts) already guards /api/email/* with a valid JWT.
export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    const full = await loadEmailSettings()
    const settings = sanitizeEmailSettings(full)
    return Response.json({ ...settings, configured: isEmailConfigured(full) })
  } catch (error) {
    return handleApiError(error)
  }
}

export const POST = withValidation(emailSettingsSchema, async (_request, body) => {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (!isAdminRole(currentUser.role.name)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await loadEmailSettings()
    const secure = body.secure ?? existing.secure ?? true

    const settings: EmailSettings = {
      host: body.host,
      port: body.port ?? defaultPortFor(secure),
      secure,
      user: body.user ?? '',
      // Leave the password blank to keep the currently stored one.
      password: body.password ? body.password : existing.password,
      fromName: body.fromName ?? '',
      fromEmail: body.fromEmail,
      // Preserve any Google OAuth connection when manual SMTP settings are saved.
      emailProvider: existing.emailProvider,
      googleClientId: existing.googleClientId,
      googleClientSecret: existing.googleClientSecret,
      googleRefreshToken: existing.googleRefreshToken,
      googleAccessToken: existing.googleAccessToken,
      googleTokenExpiresAt: existing.googleTokenExpiresAt,
      googleEmail: existing.googleEmail,
    }

    await saveEmailSettings(settings)

    try {
      await logAudit('email_settings_update', 'settings', 'Email / SMTP settings were updated', currentUser.id)
    } catch {}

    return Response.json({ success: true, settings: sanitizeEmailSettings(settings) })
  } catch (error) {
    return handleApiError(error)
  }
})
