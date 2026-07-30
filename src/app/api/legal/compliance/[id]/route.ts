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
    const item = await prisma.complianceItem.findUnique({ where: { id } })

    if (!item) {
      return Response.json({ error: 'Compliance item not found' }, { status: 404 })
    }

    return Response.json(item)
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
    const allowed = ['title', 'description', 'category', 'status', 'dueDate', 'completedDate', 'assignedTo']
    for (const key of allowed) {
      if (key in body) {
        data[key] = body[key]
      }
    }

    const item = await prisma.complianceItem.update({
      where: { id },
      data,
    })

    return Response.json(item)
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
    await prisma.complianceItem.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
