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
    const land = await prisma.landRecord.findUnique({
      where: { id },
      include: { transactions: true },
    })

    if (!land) {
      return Response.json({ error: 'Land record not found' }, { status: 404 })
    }

    return Response.json(land)
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
    const allowed = ['title', 'surveyNumber', 'areaAcres', 'areaSqft', 'landType', 'marketValue', 'address', 'city', 'ownerName', 'ownershipType', 'encumbranceStatus', 'status']
    for (const key of allowed) {
      if (key in body) {
        if (key === 'areaAcres' || key === 'areaSqft' || key === 'marketValue') {
          data[key] = body[key] != null ? new Prisma.Decimal(body[key]) : null
        } else {
          data[key] = body[key]
        }
      }
    }

    const land = await prisma.landRecord.update({
      where: { id },
      data,
    })

    return Response.json(land)
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
    await prisma.landTransaction.deleteMany({ where: { landRecordId: id } })
    await prisma.landRecord.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
