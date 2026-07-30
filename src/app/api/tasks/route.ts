export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const tasks = await prisma.projectTask.findMany({
      include: { project: true },
      orderBy: { createdAt: 'desc' },
    })

    const result = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      projectName: t.project?.name || 'Unknown',
      projectId: t.projectId,
      assignedTo: t.assignedTo,
      dueDate: t.dueDate,
      estimatedHours: t.estimatedHours,
      actualHours: t.actualHours,
    }))

    return Response.json({ tasks: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    let { projectId, title, description, status, priority, dueDate, estimatedHours } = body

    if (!title || title.trim().length === 0) {
      return Response.json({ error: 'Task title is required' }, { status: 400 })
    }
    if (!projectId) {
      const defaultProject = await prisma.project.findFirst({ orderBy: { createdAt: 'asc' } })
      if (!defaultProject) {
        return Response.json({ error: 'No projects available. Create a project first.' }, { status: 400 })
      }
      projectId = defaultProject.id
    } else {
      const project = await prisma.project.findUnique({ where: { id: projectId } })
      if (!project) {
        return Response.json({ error: 'Project not found' }, { status: 404 })
      }
    }

    const task = await prisma.projectTask.create({
      data: {
        id: crypto.randomUUID(),
        projectId,
        title,
        description: description || null,
        status: status || 'todo',
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours: estimatedHours ? Number(estimatedHours) : null,
      },
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
    }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
