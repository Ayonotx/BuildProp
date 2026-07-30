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
    const payment = await prisma.payment.findUnique({ where: { id } })

    if (!payment) {
      return Response.json({ error: 'Payment not found' }, { status: 404 })
    }

    return Response.json(payment)
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
    const allowed = ['type', 'contactId', 'invoiceId', 'amount', 'paymentMethod', 'paymentDate']
    for (const key of allowed) {
      if (key in body) {
        if (key === 'amount') {
          data[key] = new Prisma.Decimal(body[key])
        } else if (key === 'paymentDate') {
          data[key] = new Date(body[key])
        } else {
          data[key] = body[key]
        }
      }
    }

    const payment = await prisma.payment.update({
      where: { id },
      data,
    })

    return Response.json(payment)
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
    await prisma.payment.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
