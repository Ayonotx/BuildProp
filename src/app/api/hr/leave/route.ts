export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const leaves = await prisma.leaveRequest.findMany({
      include: { employee: { include: { department: true } } },
      orderBy: { createdAt: 'desc' },
    })
    
    const stats = {
      total: leaves.length,
      pending: leaves.filter(l => l.status === 'pending').length,
      approved: leaves.filter(l => l.status === 'approved').length,
      rejected: leaves.filter(l => l.status === 'rejected').length,
    }

    return Response.json({ records: leaves, stats })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { employeeId, leaveType, startDate, endDate, days, reason } = body

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return Response.json({ error: 'End date must be after start date' }, { status: 400 })
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        id: crypto.randomUUID(),
        employeeId,
        leaveType: leaveType || 'annual',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        days: days || 1,
        reason: reason || null,
      },
    })

    return Response.json(leave, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
