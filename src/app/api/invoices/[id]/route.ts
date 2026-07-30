export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return Response.json(invoice)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const data: Record<string, unknown> = {}
    const allowed = ['type', 'contactId', 'issueDate', 'dueDate', 'subtotal', 'taxAmount', 'totalAmount', 'paidAmount', 'status']
    for (const key of allowed) {
      if (key in body) {
        if (key === 'subtotal' || key === 'taxAmount' || key === 'totalAmount' || key === 'paidAmount') {
          data[key] = new Prisma.Decimal(body[key])
        } else if (key === 'issueDate' || key === 'dueDate') {
          data[key] = new Date(body[key])
        } else {
          data[key] = body[key]
        }
      }
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data,
      include: { items: true },
    })

    return Response.json(invoice)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })
    await prisma.invoice.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
