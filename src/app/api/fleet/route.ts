export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-errors'

export async function GET() {
  try {
    const vehicles = await prisma.vehicle.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    })
    return Response.json(vehicles)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, make, model, year, licensePlate, status, fuelType, mileage, assignedTo, branchId } = body

    if (!name || !licensePlate) {
      return Response.json({ error: 'Name and license plate are required' }, { status: 400 })
    }

    try {
      const vehicle = await prisma.vehicle.create({
        data: {
          name,
          make: make || '',
          model: model || '',
          year: year || new Date().getFullYear(),
          licensePlate,
          status: status || 'active',
          fuelType: fuelType || 'diesel',
          mileage: mileage || 0,
          assignedTo: assignedTo || null,
          branchId: branchId || null,
        },
      })

      return Response.json(vehicle, { status: 201 })
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
