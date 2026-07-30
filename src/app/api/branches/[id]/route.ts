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
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        vehicles: true,
        contracts: true,
      },
    })

    if (!branch) {
      return Response.json({ error: 'Branch not found' }, { status: 404 })
    }

    return Response.json(branch)
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
    const allowed = ['name', 'code', 'address', 'city', 'phone', 'email', 'manager', 'status']
    for (const key of allowed) {
      if (key in body) {
        data[key] = body[key]
      }
    }

    const branch = await prisma.branch.update({
      where: { id },
      data,
    })

    return Response.json(branch)
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

    const vehicleCount = await prisma.vehicle.count({ where: { branchId: id } })
    const contractCount = await prisma.contract.count({ where: { branchId: id } })

    if (vehicleCount > 0 || contractCount > 0) {
      return Response.json(
        { error: `Cannot delete branch with ${vehicleCount} vehicle(s) and ${contractCount} contract(s). Reassign or remove them first.` },
        { status: 400 }
      )
    }

    await prisma.branch.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
