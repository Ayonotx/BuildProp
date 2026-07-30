export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, title, description, priority, dueDate, estimatedHours, actualHours } = body

    const data: Record<string, unknown> = {}
    if (status !== undefined) data.status = status
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (priority !== undefined) data.priority = priority
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
    if (estimatedHours !== undefined) data.estimatedHours = estimatedHours ? Number(estimatedHours) : null
    if (actualHours !== undefined) data.actualHours = actualHours ? Number(actualHours) : null
    if (status === 'completed') data.completedDate = new Date()

    const task = await prisma.projectTask.update({
      where: { id },
      data,
      include: { project: true },
    })

    return Response.json({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      projectName: task.project?.name || 'Unknown',
      projectId: task.projectId,
      assignedTo: task.assignedTo,
      dueDate: task.dueDate,
      estimatedHours: task.estimatedHours,
      actualHours: task.actualHours,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.projectTask.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
