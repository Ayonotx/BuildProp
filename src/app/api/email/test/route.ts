export const dynamic = 'force-dynamic'
import { emailTestSchema } from '@/lib/validations'
import { withValidation, withApiRateLimit } from '@/lib/api-wrapper'
import { handleApiError } from '@/lib/api-errors'
import { loadEmailSettings, isEmailConfigured, sendMail } from '@/lib/email'
import { logAudit } from '@/lib/audit'
import { getCurrentUser } from '@/lib/current-user'

export const POST = withApiRateLimit(
  withValidation(emailTestSchema, async (_request, body) => {
    try {
      const settings = await loadEmailSettings()
      if (!isEmailConfigured(settings)) {
        return Response.json(
          { error: 'Email is not configured. Go to Settings → Email to set up your SMTP account.' },
          { status: 400 }
        )
      }

      const result = await sendMail({
        to: body.to,
        subject: 'BuildProp — Test Email',
        text: 'This is a test email from BuildProp. If you are reading this, your SMTP settings are working correctly.',
        html: `
          <div style="font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #1e293b;">
            <h2 style="color: #0f172a;">This is a test email from BuildProp</h2>
            <p>If you are reading this, your SMTP settings are working correctly.</p>
            <p style="color: #64748b; font-size: 13px;">Sent from your BuildProp system at ${new Date().toLocaleString()}.</p>
          </div>`,
      })

      if (!result.success) {
        return Response.json({ error: result.message }, { status: 500 })
      }

      try {
        const currentUser = await getCurrentUser()
        await logAudit('email_test', 'settings', `Test email sent to ${body.to}`, currentUser?.id)
      } catch {}

      return Response.json({ success: true, message: result.message })
    } catch (error) {
      return handleApiError(error)
    }
  })
)
