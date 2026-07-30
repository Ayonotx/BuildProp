export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { invoiceSchema } from '@/lib/validations'
import { withValidation, withApiRateLimit } from '@/lib/api-wrapper'
import { handleApiError } from '@/lib/api-errors'

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    })

    const result = await Promise.all(
      invoices.map(async (invoice) => {
        const contact = await prisma.contact.findUnique({
          where: { id: invoice.contactId || "" },
          select: { firstName: true, lastName: true },
        })
        return {
          ...invoice,
          contactName: contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown',
        }
      })
    )

    return Response.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}

export const POST = withApiRateLimit(
  withValidation(invoiceSchema, async (request, body) => {
    try {
      const { type, contactId: rawContactId, issueDate, dueDate, subtotal, taxAmount, totalAmount, items } = body

      // Resolve contactId: use provided, or fall back to first contact
      let contactId = rawContactId;
      if (!contactId) {
        const fallbackContact = await prisma.contact.findFirst({ orderBy: { createdAt: "asc" } });
        if (fallbackContact) contactId = fallbackContact.id;
        if (!contactId) {
          return Response.json({ error: "No contacts found. Create a contact or provide contactId." }, { status: 400 });
        }
      }

      const count = await prisma.invoice.count()
      const invoiceNumber = `INV-2025-${String(count + 1).padStart(3, '0')}`

      const invoice = await prisma.$transaction(async (tx) => {
        const created = await tx.invoice.create({
          data: {
            id: crypto.randomUUID(),
            invoiceNumber,
            type,
            contactId,
            issueDate: new Date(issueDate),
            dueDate: new Date(dueDate),
            subtotal: new Prisma.Decimal(subtotal ?? 0),
            taxAmount: new Prisma.Decimal(taxAmount || 0),
            totalAmount: new Prisma.Decimal(totalAmount),
            createdBy: 'system',
          },
        })

        if (items && items.length > 0) {
          await tx.invoiceItem.createMany({
            data: items.map((item: any) => ({
              id: crypto.randomUUID(),
              invoiceId: created.id,
              description: item.description,
              quantity: new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(item.unitPrice),
              amount: new Prisma.Decimal(item.amount ?? item.total ?? 0) as any,
            })),
          })
        }

        return created
      })

      return Response.json(invoice, { status: 201 })
    } catch (error) {
      return handleApiError(error)
    }
  })
)
