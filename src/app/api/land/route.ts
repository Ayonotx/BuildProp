export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const lands = await prisma.landRecord.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        transactions: true,
      },
    })

    const result = lands.map((l) => ({
      id: l.id,
      title: l.title,
      surveyNumber: l.surveyNumber,
      areaAcres: l.areaAcres,
      areaSqft: l.areaSqft,
      landType: l.landType,
      marketValue: l.marketValue,
      address: l.address,
      city: l.city,
      ownerName: l.ownerName,
      ownershipType: l.ownershipType,
      encumbranceStatus: l.encumbranceStatus,
      status: l.status,
      transactionCount: l.transactions.length,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
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
    const { title, surveyNumber, areaAcres, areaSqft, landType, marketValue, address, city, ownerName, ownershipType } = body

    const land = await prisma.landRecord.create({
      data: {
        title,
        surveyNumber: surveyNumber || null,
        areaAcres: areaAcres ? new Prisma.Decimal(areaAcres) : null,
        areaSqft: areaSqft ? new Prisma.Decimal(areaSqft) : null,
        landType: landType || 'residential',
        marketValue: marketValue ? new Prisma.Decimal(marketValue) : new Prisma.Decimal(0),
        address: address || null,
        city: city || null,
        ownerName: ownerName || null,
        ownershipType: ownershipType || null,
      },
    })

    return Response.json(land, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
