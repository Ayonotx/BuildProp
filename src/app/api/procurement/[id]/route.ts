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
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: true,
      },
    })

    if (!po) {
      return Response.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    return Response.json({
      id: po.id,
      poNumber: po.poNumber,
      supplierName: po.supplier.name,
      supplierId: po.supplierId,
      projectId: po.projectId,
      orderDate: po.orderDate,
      expectedDelivery: po.expectedDelivery,
      totalAmount: po.totalAmount,
      status: po.status,
      itemCount: po.items.length,
      items: po.items.map((i) => ({
        id: i.id,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        amount: i.amount,
      })),
      createdAt: po.createdAt,
    })
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
    const allowed = ['supplierId', 'projectId', 'orderDate', 'expectedDelivery', 'totalAmount', 'status']
    for (const key of allowed) {
      if (key in body) {
        if (key === 'totalAmount') {
          data[key] = new Prisma.Decimal(body[key])
        } else if (key === 'orderDate' || key === 'expectedDelivery') {
          data[key] = body[key] ? new Date(body[key]) : null
        } else {
          data[key] = body[key]
        }
      }
    }

    if (body.status) {
      const existing = await prisma.purchaseOrder.findUnique({ where: { id } })
      if (existing) {
        const validTransitions: Record<string, string[]> = {
          draft: ['approved', 'cancelled'],
          approved: ['received', 'cancelled'],
          received: [],
          cancelled: [],
        }
        const oldStatus = existing.status
        const newStatus = body.status as string
        const allowedTransitions = validTransitions[oldStatus] || []
        if (!allowedTransitions.includes(newStatus)) {
          return Response.json({
            error: `Cannot change status from "${oldStatus}" to "${newStatus}". Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`,
          }, { status: 400 })
        }
      }
    }

    if (body.items && Array.isArray(body.items)) {
      await prisma.purchaseOrderItem.deleteMany({ where: { poId: id } })
      data.items = {
        create: body.items.map((i: any) => ({
          description: i.description || null,
          quantity: i.quantity ? new Prisma.Decimal(i.quantity) : new Prisma.Decimal(1),
          unitPrice: i.unitPrice ? new Prisma.Decimal(i.unitPrice) : new Prisma.Decimal(0),
          amount: i.amount ? new Prisma.Decimal(i.amount) : new Prisma.Decimal(0),
        })),
      }
    }

    const po = await prisma.purchaseOrder.update({
      where: { id },
      data,
      include: { supplier: true, items: true },
    })

    return Response.json(po)
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
    await prisma.purchaseOrderItem.deleteMany({ where: { poId: id } })
    await prisma.purchaseOrder.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
