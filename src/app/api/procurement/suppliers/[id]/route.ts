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
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { purchaseOrders: true } } },
    })

    if (!supplier) {
      return Response.json({ error: 'Supplier not found' }, { status: 404 })
    }

    return Response.json(supplier)
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
    const allowed = ['name', 'contactPerson', 'email', 'phone', 'address', 'category', 'paymentTerms', 'rating', 'status']
    for (const key of allowed) {
      if (key in body) {
        if (key === 'rating') {
          data[key] = body[key] ? new Prisma.Decimal(body[key]) : null
        } else {
          data[key] = body[key] || null
        }
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data,
    })

    return Response.json(supplier)
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

    const poCount = await prisma.purchaseOrder.count({ where: { supplierId: id } })
    if (poCount > 0) {
      return Response.json(
        { error: `Cannot delete supplier with ${poCount} purchase order(s). Deactivate instead.` },
        { status: 400 }
      )
    }

    await prisma.supplier.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
