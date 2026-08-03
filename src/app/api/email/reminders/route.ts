export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { emailRemindersSchema } from '@/lib/validations'
import { withValidation, withApiRateLimit } from '@/lib/api-wrapper'
import { handleApiError } from '@/lib/api-errors'
import {
  loadEmailSettings,
  isEmailConfigured,
  sendMail,
  loadCompanySettings,
  formatAmount,
  escapeHtml,
} from '@/lib/email'
import { logAudit } from '@/lib/audit'
import { getCurrentUser } from '@/lib/current-user'

export const POST = withApiRateLimit(
  withValidation(emailRemindersSchema, async (_request, body) => {
    try {
      const settings = await loadEmailSettings()
      if (!isEmailConfigured(settings)) {
        return Response.json(
          { error: 'Email is not configured. Go to Settings → Email to set up your SMTP account.' },
          { status: 400 }
        )
      }

      const { companyName, currency } = await loadCompanySettings()

      let invoiceIds = body.invoiceIds
      if (!invoiceIds || invoiceIds.length === 0) {
        const overdue = await prisma.invoice.findMany({
          where: { status: 'overdue' },
          select: { id: true },
        })
        invoiceIds = overdue.map((i) => i.id)
      }

      let sent = 0
      let errors = 0

      for (const invoiceId of invoiceIds) {
        try {
          const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { items: true },
          })
          if (!invoice) {
            errors += 1
            continue
          }

          const contact = await prisma.contact.findUnique({
            where: { id: invoice.contactId },
          })
          if (!contact?.email) {
            errors += 1
            continue
          }

          const totalAmount = Number(invoice.totalAmount)
          const paidAmount = Number(invoice.paidAmount)
          const balanceDue = Math.max((isNaN(totalAmount) ? 0 : totalAmount) - (isNaN(paidAmount) ? 0 : paidAmount), 0)

          const result = await sendMail({
            to: contact.email,
            subject: `Payment Reminder: Invoice ${invoice.invoiceNumber} is overdue`,
            text: `Friendly reminder that invoice #${invoice.invoiceNumber} of ${formatAmount(balanceDue, currency)} is overdue. Please arrange payment at your earliest convenience. Thank you, ${companyName}.`,
            html: `
              <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
                <div style="background: #0f172a; color: #fff; padding: 20px; border-radius: 8px 8px 0 0;">
                  <h3 style="margin: 0;">${escapeHtml(companyName)}</h3>
                </div>
                <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0 0 12px;">Dear ${escapeHtml(contact.firstName)} ${escapeHtml(contact.lastName)},</p>
                  <p style="margin: 0 0 12px;">
                    Friendly reminder that invoice <strong>#${escapeHtml(invoice.invoiceNumber)}</strong> of
                    <strong>${formatAmount(balanceDue, currency)}</strong> is overdue. We would appreciate it if you could
                    arrange payment at your earliest convenience.
                  </p>
                  <p style="margin: 0 0 4px;">Invoice details:</p>
                  <p style="margin: 0; font-size: 14px; color: #475569;">
                    Amount due: <strong>${formatAmount(balanceDue, currency)}</strong><br/>
                    Invoice date: ${new Date(invoice.issueDate).toLocaleDateString('en-GB')}<br/>
                    Due date: ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}
                  </p>
                  <p style="margin-top: 20px; font-size: 13px; color: #64748b;">Thank you for your prompt attention to this matter.</p>
                  <p style="margin: 24px 0 0; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
                    ${escapeHtml(companyName)} — sent via BuildProp.
                  </p>
                </div>
              </div>`,
          })

          if (result.success) {
            sent += 1
          } else {
            errors += 1
          }
        } catch {
          errors += 1
        }
      }

      try {
        const currentUser = await getCurrentUser()
        await logAudit('email_reminders', 'invoices', `Sent ${sent} overdue invoice reminder(s), ${errors} failed`, currentUser?.id)
      } catch {}

      return Response.json({ success: true, sent, errors })
    } catch (error) {
      return handleApiError(error)
    }
  })
)
