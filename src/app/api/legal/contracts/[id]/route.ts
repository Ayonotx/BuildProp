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
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    })

    if (!contract) {
      return Response.json({ error: 'Contract not found' }, { status: 404 })
    }

    return Response.json(contract)
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
    const allowed = ['title', 'type', 'partyName', 'value', 'status', 'startDate', 'endDate', 'branchId', 'notes']
    for (const key of allowed) {
      if (key in body) {
        data[key] = body[key]
      }
    }

    const contract = await prisma.contract.update({
      where: { id },
      data,
    })

    return Response.json(contract)
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
    await prisma.contract.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
