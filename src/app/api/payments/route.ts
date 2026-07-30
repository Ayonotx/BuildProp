export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { paymentSchema } from '@/lib/validations'
import { withValidation, withApiRateLimit } from '@/lib/api-wrapper'
import { handleApiError } from '@/lib/api-errors'

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const result = await Promise.all(
      payments.map(async (payment) => {
        const contact = await prisma.contact.findUnique({
          where: { id: payment.contactId || "" },
          select: { firstName: true, lastName: true },
        })
        const invoice = payment.invoiceId
          ? await prisma.invoice.findUnique({
              where: { id: payment.invoiceId },
              select: { invoiceNumber: true, totalAmount: true },
            })
          : null
        return {
          ...payment,
          contactName: contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown',
          invoice,
        }
      })
    )

    return Response.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}

export const POST = withApiRateLimit(
  withValidation(paymentSchema, async (request, body) => {
    try {
      const { type, contactId: rawContactId, invoiceId, amount, paymentMethod, paymentDate } = body

      // Resolve contactId: use provided, or fall back to first contact
      let contactId = rawContactId;
      if (!contactId) {
        const fallbackContact = await prisma.contact.findFirst({ orderBy: { createdAt: "asc" } });
        if (fallbackContact) contactId = fallbackContact.id;
        if (!contactId) {
          return Response.json({ error: "No contacts found. Create a contact or provide contactId." }, { status: 400 });
        }
      }

      const count = await prisma.payment.count()
      const paymentNumber = `PAY-2025-${String(count + 1).padStart(3, '0')}`

      const payment = await prisma.$transaction(async (tx) => {
        const created = await tx.payment.create({
          data: {
            id: crypto.randomUUID(),
            paymentNumber,
            type,
            contactId,
            invoiceId: invoiceId || null,
            amount: new Prisma.Decimal(amount),
            paymentMethod,
            paymentDate: new Date(paymentDate),
            createdBy: 'system',
          },
        })

        if (invoiceId) {
          const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } })
          if (!invoice) {
            throw new Error('Invoice not found')
          }
          const currentPaid = Number(invoice.paidAmount || 0)
          const totalDue = Number(invoice.totalAmount)
          const paymentAmount = Number(amount)
          const newPaidAmount = currentPaid + paymentAmount

          if (newPaidAmount > totalDue + 0.01) {
            throw new Error(
              `Payment of ${paymentAmount} would exceed remaining balance of ${totalDue - currentPaid}`
            )
          }

          const invoiceStatus = newPaidAmount >= totalDue ? 'paid' : invoice.status

          await tx.invoice.update({
            where: { id: invoiceId },
            data: {
              paidAmount: newPaidAmount,
              status: invoiceStatus,
            },
          })
        }

        return created
      })

      return Response.json(payment, { status: 201 })
    } catch (error) {
      return handleApiError(error)
    }
  })
)
