export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const assets = await prisma.asset.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        maintenanceRecords: true,
      },
    })

    const result = assets.map((a) => ({
      id: a.id,
      name: a.name,
      assetCode: a.assetCode,
      category: a.category,
      purchaseDate: a.purchaseDate,
      purchasePrice: a.purchasePrice,
      currentValue: a.currentValue,
      status: a.status,
      location: a.location,
      insuranceExpiry: a.insuranceExpiry,
      maintenanceCount: a.maintenanceRecords.length,
      createdAt: a.createdAt,
    }))

    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, category, purchaseDate, purchasePrice, currentValue, location } = body

    const count = await prisma.asset.count()
    const assetCode = `AST-${String(count + 1).padStart(4, '0')}`

    const asset = await prisma.asset.create({
      data: {
        name,
        assetCode,
        category: category || 'general',
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        purchasePrice: purchasePrice ? new Prisma.Decimal(purchasePrice) : new Prisma.Decimal(0),
        currentValue: currentValue ? new Prisma.Decimal(currentValue) : new Prisma.Decimal(0),
        location: location || null,
      },
    })

    return Response.json(asset, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
