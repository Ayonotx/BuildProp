export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const property = await prisma.property.findUnique({
      where: { id },
      include: { units: true },
    })

    if (!property) {
      return Response.json({ error: 'Property not found' }, { status: 404 })
    }

    return Response.json(property)
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
    const allowed = ['name', 'description', 'propertyType', 'status', 'price', 'rentalPrice', 'areaSqft', 'bedrooms', 'bathrooms', 'address', 'city', 'state', 'images']
    for (const key of allowed) {
      if (key in body) {
        if (key === 'price' || key === 'rentalPrice' || key === 'areaSqft') {
          data[key] = new Prisma.Decimal(body[key])
        } else {
          data[key] = body[key]
        }
      }
    }

    const property = await prisma.property.update({
      where: { id },
      data,
    })

    return Response.json(property)
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
    await prisma.lease.deleteMany({ where: { propertyId: id } })
    try {
      await prisma.property.delete({ where: { id } })
      return Response.json({ success: true })
    } catch (error: any) {
      if (error.code === 'P2025') {
        return Response.json({ error: 'Property not found' }, { status: 404 })
      }
      throw error
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
