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
    const sale = await prisma.sale.findUnique({
      where: { id },
    })

    if (!sale) {
      return Response.json({ error: 'Sale not found' }, { status: 404 })
    }

    return Response.json(sale)
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
    const allowed = ['propertyId', 'contactId', 'salePrice', 'commissionRate', 'saleDate', 'status', 'paymentStatus', 'notes']
    for (const key of allowed) {
      if (key in body) {
        if (key === 'salePrice' || key === 'commissionRate') {
          data[key] = new Prisma.Decimal(body[key])
        } else if (key === 'saleDate') {
          data[key] = body[key] ? new Date(body[key]) : null
        } else {
          data[key] = body[key]
        }
      }
    }

    if ('salePrice' in data || 'commissionRate' in data) {
      const existing = await prisma.sale.findUnique({ where: { id } })
      const price = data.salePrice ? new Prisma.Decimal(data.salePrice as string) : existing!.salePrice
      const rate = data.commissionRate ? new Prisma.Decimal(data.commissionRate as string) : existing!.commissionRate
      data.commissionAmount = price.mul(rate).div(100)
    }

    const sale = await prisma.sale.update({
      where: { id },
      data,
    })

    return Response.json(sale)
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
    await prisma.sale.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
