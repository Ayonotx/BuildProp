export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const now = new Date()
    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const [
      totalProjects,
      projectsByStatus,
      totalProperties,
      propertiesByStatus,
      revenueResult,
      unpaidInvoices,
      recentProjects,
      recentPayments,
      upcomingTasks,
      monthlyPayments,
      allProjects,
      budgetItems,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.groupBy({ by: ['status'], _count: true }),
      prisma.property.count(),
      prisma.property.groupBy({ by: ['status'], _count: true }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { type: 'received' },
      }),
      prisma.invoice.findMany({
        where: { status: { not: 'paid' } },
        select: {
          totalAmount: true,
          paidAmount: true,
        },
      }),
      prisma.project.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, status: true, createdAt: true },
      }),
      prisma.payment.findMany({
        take: 5,
        orderBy: { paymentDate: 'desc' },
        select: { id: true, paymentNumber: true, amount: true, paymentDate: true, type: true },
      }),
      prisma.projectTask.findMany({
        where: {
          status: { not: 'completed' },
          dueDate: { gte: now },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
        select: { id: true, title: true, status: true, priority: true, dueDate: true, projectId: true },
      }),
      prisma.payment.findMany({
        where: {
          type: 'received',
          paymentDate: { gte: sixMonthsAgo },
        },
        select: { amount: true, paymentDate: true },
      }),
      prisma.project.findMany({
        select: { id: true, name: true, status: true, estimatedBudget: true, actualCost: true },
      }),
      prisma.budget.findMany({
        select: { projectId: true, budgetedAmount: true, spentAmount: true },
      }),
    ])

    const statusMap: Record<string, number> = {}
    for (const s of projectsByStatus) {
      statusMap[s.status] = s._count
    }

    const propStatusMap: Record<string, number> = {}
    for (const s of propertiesByStatus) {
      propStatusMap[s.status] = s._count
    }

    const activeProjects = (statusMap['in_progress'] ?? 0) + (statusMap['planning'] ?? 0)
    const availableProperties = propStatusMap['available'] ?? 0

    let totalOutstanding = new Prisma.Decimal(0)
    for (const inv of unpaidInvoices) {
      totalOutstanding = totalOutstanding.plus(inv.totalAmount).minus(inv.paidAmount)
    }

    const monthlyRevMap: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now)
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthlyRevMap[key] = 0
    }

    for (const p of monthlyPayments) {
      const d = new Date(p.paymentDate)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (key in monthlyRevMap) {
        monthlyRevMap[key] += Number(p.amount)
      }
    }

    const monthlyRevenue = Object.entries(monthlyRevMap).map(([month, amount]) => ({
      month,
      amount,
    }))

    const recentActivities = [
      ...recentProjects.map((p) => ({
        type: 'project',
        id: p.id,
        title: p.name,
        status: p.status,
        date: p.createdAt,
      })),
      ...recentPayments.map((p) => ({
        type: 'payment',
        id: p.id,
        title: p.paymentNumber,
        amount: Number(p.amount),
        date: p.paymentDate,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)

    const projectCosts: Record<string, { budgeted: number; spent: number }> = {}
    for (const item of budgetItems) {
      if (!projectCosts[item.projectId]) projectCosts[item.projectId] = { budgeted: 0, spent: 0 }
      projectCosts[item.projectId].budgeted += Number(item.budgetedAmount)
      projectCosts[item.projectId].spent += Number(item.spentAmount)
    }

    const projectProfitability = allProjects.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      budgeted: projectCosts[p.id]?.budgeted || 0,
      spent: projectCosts[p.id]?.spent || 0,
      budget: Number(p.estimatedBudget || 0),
      variance: (projectCosts[p.id]?.budgeted || 0) - (projectCosts[p.id]?.spent || 0),
      variancePercent: projectCosts[p.id]?.budgeted
        ? Math.round(((projectCosts[p.id].budgeted - projectCosts[p.id].spent) / projectCosts[p.id].budgeted) * 100)
        : 0,
    }))

    return Response.json({
      kpi: {
        totalProjects,
        activeProjects,
        totalProperties,
        availableProperties,
        revenue: Number(revenueResult._sum.amount ?? 0),
        outstanding: Number(totalOutstanding),
      },
      projectStatus: projectsByStatus.map((s) => ({ status: s.status, count: s._count })),
      recentActivities,
      upcomingTasks,
      monthlyRevenue,
      projectProfitability,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
