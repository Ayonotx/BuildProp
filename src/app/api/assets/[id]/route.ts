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
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { maintenanceRecords: true },
    })

    if (!asset) {
      return Response.json({ error: 'Asset not found' }, { status: 404 })
    }

    return Response.json(asset)
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
    const allowed = ['name', 'category', 'purchaseDate', 'purchasePrice', 'currentValue', 'status', 'location', 'insuranceExpiry']
    for (const key of allowed) {
      if (key in body) {
        if (key === 'purchasePrice' || key === 'currentValue') {
          data[key] = body[key] != null ? new Prisma.Decimal(body[key]) : null
        } else if (key === 'purchaseDate' || key === 'insuranceExpiry') {
          data[key] = body[key] ? new Date(body[key]) : null
        } else {
          data[key] = body[key]
        }
      }
    }

    const asset = await prisma.asset.update({
      where: { id },
      data,
    })

    return Response.json(asset)
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
    await prisma.maintenanceRecord.deleteMany({ where: { assetId: id } })
    await prisma.asset.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
