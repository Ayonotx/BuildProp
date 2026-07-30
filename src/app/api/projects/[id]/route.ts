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
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        milestones: true,
        tasks: true,
        budgets: true,
      },
    })

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    return Response.json(project)
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
    const allowed = ['name', 'code', 'description', 'projectType', 'status', 'priority', 'startDate', 'endDate', 'estimatedBudget', 'actualCost', 'completionPercentage', 'location']
    for (const key of allowed) {
      if (key in body) {
        if (key === 'estimatedBudget' || key === 'actualCost' || key === 'completionPercentage') {
          data[key] = new Prisma.Decimal(body[key])
        } else if (key === 'startDate' || key === 'endDate') {
          data[key] = body[key] ? new Date(body[key]) : null
        } else {
          data[key] = body[key]
        }
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data,
    })

    return Response.json(project)
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

    const [taskCount, milestoneCount] = await Promise.all([
      prisma.projectTask.count({ where: { projectId: id } }),
      prisma.projectMilestone.count({ where: { projectId: id } }),
    ])

    if (taskCount > 0) {
      await prisma.projectTask.deleteMany({ where: { projectId: id } })
    }
    if (milestoneCount > 0) {
      await prisma.projectMilestone.deleteMany({ where: { projectId: id } })
    }

    await prisma.budget.deleteMany({ where: { projectId: id } })
    await prisma.purchaseOrder.deleteMany({ where: { projectId: id } })
    await prisma.project.delete({ where: { id } })

    return Response.json({
      success: true,
      deleted: { tasks: taskCount, milestones: milestoneCount },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
