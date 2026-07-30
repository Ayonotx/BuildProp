export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const items = await prisma.inventoryItem.findMany({
      orderBy: { name: 'asc' },
      include: {
        category: { select: { id: true, name: true } },
        warehouseStock: {
          include: { warehouse: { select: { id: true, name: true } } },
        },
      },
    })

    return Response.json(items)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, categoryId, unitOfMeasure, minStock, maxStock, currentStock, unitCost } = body

    if (!name || !unitOfMeasure) {
      return Response.json({ error: 'name and unitOfMeasure are required' }, { status: 400 })
    }
    if (currentStock !== undefined && (typeof currentStock !== 'number' || currentStock < 0)) {
      return Response.json({ error: 'Stock quantity cannot be negative' }, { status: 400 })
    }

    const count = await prisma.inventoryItem.count()
    const sku = `INV-${String(count + 1).padStart(4, '0')}`

    const item = await prisma.inventoryItem.create({
      data: {
        sku,
        name,
        description: description || null,
        categoryId: categoryId || (await prisma.inventoryCategory.findFirst({ orderBy: { name: 'asc' } }))?.id || '',
        unitOfMeasure,
        minStock: minStock ? new Prisma.Decimal(minStock) : new Prisma.Decimal(0),
        maxStock: maxStock ? new Prisma.Decimal(maxStock) : new Prisma.Decimal(0),
        currentStock: currentStock ? new Prisma.Decimal(currentStock) : new Prisma.Decimal(0),
        unitCost: unitCost ? new Prisma.Decimal(unitCost) : new Prisma.Decimal(0),
      },
      include: {
        category: { select: { id: true, name: true } },
        warehouseStock: {
          include: { warehouse: { select: { id: true, name: true } } },
        },
      },
    })

    return Response.json(item, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
