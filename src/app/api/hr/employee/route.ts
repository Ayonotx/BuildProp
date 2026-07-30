export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { designation, departmentId, employmentType, salary } = body

    const { firstName, lastName } = body
    if (!firstName || firstName.trim().length === 0) {
      return Response.json({ error: 'First name is required' }, { status: 400 })
    }
    if (!lastName || lastName.trim().length === 0) {
      return Response.json({ error: 'Last name is required' }, { status: 400 })
    }
    if (salary !== undefined && (typeof salary !== 'number' || salary < 0)) {
      return Response.json({ error: 'Salary must be a non-negative number' }, { status: 400 })
    }
    if (designation !== undefined && designation !== null && designation.trim().length === 0) {
      return Response.json({ error: 'Designation cannot be empty' }, { status: 400 })
    }

    const count = await prisma.employee.count()
    const employeeId = `EMP-${String(count + 1).padStart(4, '0')}`

    const employee = await prisma.employee.create({
      data: {
        id: crypto.randomUUID(),
        employeeId,
        designation,
        departmentId,
        employmentType: employmentType || 'full_time',
        salary: Number(salary) || 0,
        dateOfJoining: new Date(),
        status: 'active',
      },
      include: { department: true },
    })

    return Response.json(employee, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
