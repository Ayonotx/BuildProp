export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { calculateGhanaPayroll } from '@/lib/ghana-tax'

export async function GET() {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const payroll = await prisma.payroll.findMany({
      where: {
        periodStart: { gte: startOfMonth },
        periodEnd: { lte: endOfMonth },
      },
      include: { employee: true },
      orderBy: { periodStart: 'desc' },
    })

    const records = payroll.map((p) => ({
      id: p.id,
      employeeId: p.employee.employeeId,
      employeeName: p.employee.designation,
      employeeDbId: p.employeeId,
      baseSalary: p.basicSalary,
      allowances: p.allowances,
      deductions: p.deductions,
      netPay: p.netPay,
      status: p.status,
      paidDate: p.paidDate,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
    }))

    const totalPayroll = records.reduce((sum, r) => sum + Number(r.netPay), 0)
    const avgSalary = records.length > 0 ? totalPayroll / records.length : 0
    const pendingPayments = records.filter((r) => r.status === 'draft').length

    return Response.json({
      records,
      stats: {
        totalPayroll,
        avgSalary: Math.round(avgSalary),
        pendingPayments,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const existing = await prisma.payroll.findMany({
      where: {
        periodStart: { gte: startOfMonth },
        periodEnd: { lte: endOfMonth },
      },
    })

    if (existing.length > 0) {
      return Response.json({ error: 'Payroll already generated for this month' }, { status: 400 })
    }

    const activeEmployees = await prisma.employee.findMany({
      where: { status: 'active' },
    })

    if (activeEmployees.length === 0) {
      return Response.json({ error: 'No active employees found' }, { status: 400 })
    }

    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: 'approved',
        startDate: { gte: startOfMonth },
        endDate: { lte: endOfMonth },
      },
    })

    const leaveDaysByEmployee = new Map<string, number>()
    for (const leave of approvedLeaves) {
      const current = leaveDaysByEmployee.get(leave.employeeId) || 0
      leaveDaysByEmployee.set(leave.employeeId, current + leave.days)
    }

    const payrollRecords = []

    for (const emp of activeEmployees) {
      const baseSalary = Number(emp.salary)
      const ghanaPayroll = calculateGhanaPayroll(baseSalary)

      const leaveDays = leaveDaysByEmployee.get(emp.id) || 0
      const workingDaysInMonth = 22
      const leaveDeduction = (baseSalary / workingDaysInMonth) * leaveDays
      const totalDeductions = ghanaPayroll.employee.totalDeductions + leaveDeduction
      const netPay = ghanaPayroll.employee.netPay - leaveDeduction

      const record = await prisma.payroll.create({
        data: {
          id: crypto.randomUUID(),
          employeeId: emp.id,
          periodStart: startOfMonth,
          periodEnd: endOfMonth,
          basicSalary: new Prisma.Decimal(baseSalary),
          allowances: new Prisma.Decimal(ghanaPayroll.employer.totalEmployerCost - baseSalary),
          deductions: new Prisma.Decimal(totalDeductions),
          netPay: new Prisma.Decimal(netPay),
          status: 'draft',
        },
      })

      payrollRecords.push(record)
    }

    return Response.json({ count: payrollRecords.length, message: `Generated payroll for ${payrollRecords.length} employees` }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
