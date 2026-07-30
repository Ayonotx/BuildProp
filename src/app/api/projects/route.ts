export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { projectSchema } from '@/lib/validations'
import { withValidation, withApiRateLimit } from '@/lib/api-wrapper'
import { handleApiError } from '@/lib/api-errors'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const [rawProjects, total] = await Promise.all([
      prisma.project.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          milestones: { select: { id: true } },
          tasks: { select: { id: true } },
        },
      }),
      prisma.project.count(),
    ])

    const projects = rawProjects.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description,
      projectType: p.projectType,
      status: p.status,
      priority: p.priority,
      startDate: p.startDate,
      endDate: p.endDate,
      estimatedBudget: p.estimatedBudget,
      actualCost: p.actualCost,
      completionPercentage: p.completionPercentage,
      location: p.location,
      projectManagerId: p.projectManagerId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      milestoneCount: p.milestones.length,
      taskCount: p.tasks.length,
    }))

    return Response.json({
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export const POST = withApiRateLimit(
  withValidation(projectSchema, async (request, body) => {
    try {
      const { name, code, description, projectType, status, priority, startDate, endDate, estimatedBudget, location } = body

      const adminRole = await prisma.role.findFirst({
        where: { name: { in: ['Super Admin', 'Admin'] } },
      })

      let projectManagerId = ''
      if (adminRole) {
        const adminUser = await prisma.user.findFirst({
          where: { roleId: adminRole.id },
        })
        if (adminUser) projectManagerId = adminUser.id
      }

      const project = await prisma.project.create({
        data: {
          id: crypto.randomUUID(),
          name,
          code,
          description: description || null,
          projectType: projectType || 'residential',
          status: status || 'planning',
          priority: priority || 'medium',
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          estimatedBudget: estimatedBudget ? new Prisma.Decimal(estimatedBudget) : new Prisma.Decimal(0),
          location: location || null,
          projectManagerId,
        },
      })

      return Response.json(project, { status: 201 })
    } catch (error) {
      return handleApiError(error)
    }
  })
)
