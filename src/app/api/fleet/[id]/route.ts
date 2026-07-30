export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-errors'
import type { NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    })

    if (!vehicle) {
      return Response.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    return Response.json(vehicle)
  } catch (error) {
    return handleApiError(error)
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
    const allowed = ['name', 'make', 'model', 'year', 'licensePlate', 'status', 'fuelType', 'mileage', 'assignedTo', 'branchId']
    for (const key of allowed) {
      if (key in body) {
        data[key] = body[key]
      }
    }

    try {
      const vehicle = await prisma.vehicle.update({
        where: { id },
        data,
      })

      return Response.json(vehicle)
    } catch (error: any) {
      if (error.code === 'P2002') {
        return Response.json({ error: 'A vehicle with this license plate already exists' }, { status: 409 })
      }
      throw error
    }
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.vehicle.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
