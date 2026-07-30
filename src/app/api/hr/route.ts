export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [employees, departments, leaveRequests] = await Promise.all([
      prisma.employee.findMany({
        include: {
          department: true,
          attendance: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.department.findMany({
        include: { employees: true },
        orderBy: { name: 'asc' },
      }),
      prisma.leaveRequest.findMany({
        include: { employee: true },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const resultEmployees = employees.map((e) => ({
      id: e.id,
      employeeId: e.employeeId,
      designation: e.designation,
      departmentName: e.department?.name || 'Unknown',
      departmentId: e.departmentId,
      employmentType: e.employmentType,
      dateOfJoining: e.dateOfJoining,
      salary: e.salary,
      status: e.status,
      attendanceCount: e.attendance.length,
    }))

    const resultDepartments = departments.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      employeeCount: d.employees.length,
    }))

    const resultLeaveRequests = leaveRequests.map((lr) => ({
      id: lr.id,
      employeeName: lr.employee?.designation || lr.employeeId,
      employeeId: lr.employeeId,
      leaveType: lr.leaveType,
      startDate: lr.startDate,
      endDate: lr.endDate,
      days: lr.days,
      status: lr.status,
    }))

    return Response.json({
      employees: resultEmployees,
      departments: resultDepartments,
      leaveRequests: resultLeaveRequests,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
