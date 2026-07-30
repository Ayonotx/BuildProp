export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    })
    return Response.json(departments)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name || name.trim().length === 0) {
      return Response.json({ error: 'Department name is required' }, { status: 400 })
    }

    // Check for duplicate
    const existing = await prisma.department.findFirst({ where: { name: name.trim() } })
    if (existing) {
      return Response.json({ error: 'A department with this name already exists' }, { status: 409 })
    }

    const count = await prisma.department.count()
    const code = `DEPT-${String(count + 1).padStart(3, '0')}`

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        code,
      },
    })

    return Response.json(department, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
