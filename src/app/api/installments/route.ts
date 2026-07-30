export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const plans = await prisma.installmentPlan.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
    })

    const saleIds = [...new Set(plans.map((p) => p.saleId).filter(Boolean))]
    const sales = saleIds.length > 0
      ? await prisma.sale.findMany({ where: { id: { in: saleIds } } })
      : []
    const propertyIds = [...new Set(sales.map((s) => s.propertyId).filter(Boolean))]
    const contactIds = [...new Set(sales.map((s) => s.contactId).filter(Boolean))]
    const [properties, contacts] = await Promise.all([
      propertyIds.length > 0 ? prisma.property.findMany({ where: { id: { in: propertyIds } } }) : [],
      contactIds.length > 0 ? prisma.contact.findMany({ where: { id: { in: contactIds } } }) : [],
    ])
    const propertyMap = new Map(properties.map((p) => [p.id, p]))
    const contactMap = new Map(contacts.map((c) => [c.id, c]))
    const saleMap = new Map(sales.map((s) => [s.id, s]))

    const result = plans.map((plan) => {
      const sale = saleMap.get(plan.saleId)
      const property = sale ? propertyMap.get(sale.propertyId) : null
      const contact = sale ? contactMap.get(sale.contactId) : null
      return {
        ...plan,
        propertyName: property?.name || 'Unknown',
        buyerName: contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown',
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
    const { saleId, totalAmount, numberOfPayments, frequency, startDate } = body

    if (!saleId || !totalAmount || !numberOfPayments || !frequency || !startDate) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const total = new Prisma.Decimal(totalAmount)
    const installmentAmount = total.div(numberOfPayments)
    const start = new Date(startDate)

    const installmentsData: Array<{
      installmentNumber: number
      amount: Prisma.Decimal
      dueDate: Date
      status: string
    }> = []

    for (let i = 0; i < numberOfPayments; i++) {
      const dueDate = new Date(start)
      if (frequency === 'monthly') {
        dueDate.setMonth(dueDate.getMonth() + i)
      } else if (frequency === 'quarterly') {
        dueDate.setMonth(dueDate.getMonth() + i * 3)
      } else {
        dueDate.setDate(dueDate.getDate() + i * 30)
      }
      installmentsData.push({
        installmentNumber: i + 1,
        amount: installmentAmount,
        dueDate,
        status: 'pending',
      })
    }

    const plan = await prisma.installmentPlan.create({
      data: {
        saleId,
        totalAmount: total,
        numberOfPayments,
        frequency,
        startDate: start,
        installments: {
          create: installmentsData,
        },
      },
      include: {
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
    })

    return Response.json(plan, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
