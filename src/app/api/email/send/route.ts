export const dynamic = 'force-dynamic'
import { emailSendSchema } from '@/lib/validations'
import { withValidation, withApiRateLimit } from '@/lib/api-wrapper'
import { handleApiError } from '@/lib/api-errors'
import { loadEmailSettings, isEmailConfigured, sendMail } from '@/lib/email'

export const POST = withApiRateLimit(
  withValidation(emailSendSchema, async (_request, body) => {
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
        subject: body.subject,
        html: body.html,
      })

      if (!result.success) {
        return Response.json({ error: result.message }, { status: 500 })
      }

      return Response.json({ success: true })
    } catch (error) {
      return handleApiError(error)
    }
  })
)
