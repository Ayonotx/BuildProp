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
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        warehouseStock: {
          include: { warehouse: { select: { id: true, name: true } } },
        },
      },
    })

    if (!item) {
      return Response.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    return Response.json(item)
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
    const allowed = ['name', 'description', 'categoryId', 'unitOfMeasure', 'minStock', 'maxStock', 'currentStock', 'unitCost', 'isActive']
    for (const key of allowed) {
      if (key in body) {
        if (['minStock', 'maxStock', 'currentStock', 'unitCost'].includes(key)) {
          data[key] = body[key] != null ? new Prisma.Decimal(body[key]) : null
        } else {
          data[key] = body[key]
        }
      }
    }

    const item = await prisma.inventoryItem.update({
      where: { id },
      data,
    })

    return Response.json(item)
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
    await prisma.warehouseStock.deleteMany({ where: { itemId: id } })
    await prisma.inventoryTransaction.deleteMany({ where: { itemId: id } })
    await prisma.inventoryItem.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
