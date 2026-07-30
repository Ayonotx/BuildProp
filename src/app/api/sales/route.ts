export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const sales = await prisma.sale.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const propertyIds = [...new Set(sales.map((s) => s.propertyId).filter(Boolean))]
    const contactIds = [...new Set(sales.map((s) => s.contactId).filter(Boolean))]

    const [properties, contacts] = await Promise.all([
      propertyIds.length > 0 ? prisma.property.findMany({ where: { id: { in: propertyIds } } }) : [],
      contactIds.length > 0 ? prisma.contact.findMany({ where: { id: { in: contactIds } } }) : [],
    ])

    const propertyMap = new Map(properties.map((p) => [p.id, p]))
    const contactMap = new Map(contacts.map((c) => [c.id, c]))

    const result = sales.map((s) => {
      const property = propertyMap.get(s.propertyId)
      const contact = contactMap.get(s.contactId)
      return {
        id: s.id,
        saleNumber: s.saleNumber,
        propertyName: property?.name || 'Unknown Property',
        propertyId: s.propertyId,
        buyerName: contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown',
        contactId: s.contactId,
        salePrice: s.salePrice,
        commissionRate: s.commissionRate,
        commissionAmount: s.commissionAmount,
        saleDate: s.saleDate,
        status: s.status,
        paymentStatus: s.paymentStatus,
        notes: s.notes,
        createdAt: s.createdAt,
      }
    })

    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { propertyId, contactId, salePrice, commissionRate, saleDate, status, paymentStatus, notes } = body

    if (propertyId) {
      const property = await prisma.property.findUnique({ where: { id: propertyId } })
      if (!property) {
        return Response.json({ error: 'Property not found' }, { status: 404 })
      }
    }
    if (contactId) {
      const contact = await prisma.contact.findUnique({ where: { id: contactId } })
      if (!contact) {
        return Response.json({ error: 'Contact not found' }, { status: 404 })
      }
    }

    const count = await prisma.sale.count()
    const saleNumber = `SALE-${String(count + 1).padStart(5, '0')}`

    const price = salePrice ? new Prisma.Decimal(salePrice) : new Prisma.Decimal(0)
    const rate = commissionRate ? new Prisma.Decimal(commissionRate) : new Prisma.Decimal(0)
    const commission = price.mul(rate).div(100)

    const sale = await prisma.sale.create({
      data: {
        saleNumber,
        propertyId,
        contactId,
        salePrice: price,
        commissionRate: rate,
        commissionAmount: commission,
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        status: status || 'quotation',
        paymentStatus: paymentStatus || 'pending',
        notes: notes || null,
      },
    })

    return Response.json(sale, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
