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
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    })

    if (!employee) {
      return Response.json({ error: 'Employee not found' }, { status: 404 })
    }

    return Response.json(employee)
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
    const allowed = ['userId', 'employeeId', 'departmentId', 'designation', 'employmentType', 'dateOfJoining', 'salary', 'status']
    for (const key of allowed) {
      if (key in body) {
        if (key === 'salary') {
          data[key] = new Prisma.Decimal(body[key])
        } else if (key === 'dateOfJoining') {
          data[key] = body[key] ? new Date(body[key]) : undefined
        } else {
          data[key] = body[key]
        }
      }
    }

    const employee = await prisma.employee.update({
      where: { id },
      data,
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    })

    return Response.json(employee)
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
    await prisma.employee.update({
      where: { id },
      data: { status: 'inactive' },
    })
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
