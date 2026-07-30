export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

function getDateRange(range: string): Date | null {
  const now = new Date()
  switch (range) {
    case '30d': {
      const d = new Date(now)
      d.setDate(d.getDate() - 30)
      return d
    }
    case 'quarter': {
      const d = new Date(now)
      const quarter = Math.floor(d.getMonth() / 3)
      d.setMonth(quarter * 3, 1)
      d.setHours(0, 0, 0, 0)
      return d
    }
    case 'year': {
      return new Date(now.getFullYear(), 0, 1)
    }
    default:
      return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const range = request.nextUrl.searchParams.get('range') || 'all'
    const startDate = getDateRange(range)

    const dateFilter = startDate ? { gte: startDate } : undefined

    const [
      projects,
      payments,
      properties,
      employees,
      inventoryItems,
      landRecords,
      suppliers,
      purchaseOrders,
      invoices,
      budgets,
    ] = await Promise.all([
      prisma.project.findMany({
        select: { status: true, estimatedBudget: true, actualCost: true, name: true, startDate: true, id: true },
        ...(startDate ? { where: { startDate: dateFilter } } : {}),
      }),
      prisma.payment.findMany({
        select: { type: true, amount: true, paymentDate: true },
        ...(startDate ? { where: { paymentDate: dateFilter } } : {}),
      }),
      prisma.property.findMany({ select: { status: true, price: true } }),
      prisma.employee.findMany({ select: { status: true, salary: true } }),
      prisma.inventoryItem.findMany({ select: { currentStock: true, unitOfMeasure: true, unitCost: true } }),
      prisma.landRecord.findMany({ select: { status: true, marketValue: true } }),
      prisma.supplier.findMany({ select: { id: true } }),
      prisma.purchaseOrder.findMany({
        select: { status: true, totalAmount: true, orderDate: true },
        ...(startDate ? { where: { orderDate: dateFilter } } : {}),
      }),
      prisma.invoice.findMany({
        select: { type: true, totalAmount: true, status: true, issueDate: true },
        ...(startDate ? { where: { issueDate: dateFilter } } : {}),
      }),
      prisma.budget.findMany({
        select: { projectId: true, budgetedAmount: true, spentAmount: true },
      }),
    ])

    const projectsByStatus = {
      planning: projects.filter((p) => p.status === 'planning').length,
      in_progress: projects.filter((p) => p.status === 'in_progress').length,
      completed: projects.filter((p) => p.status === 'completed').length,
      on_hold: projects.filter((p) => p.status === 'on_hold').length,
    }

    const revenue = payments
      .filter((p) => p.type === 'received')
      .reduce((sum, p) => sum + Number(p.amount), 0)

    const expenses = payments
      .filter((p) => p.type === 'made')
      .reduce((sum, p) => sum + Number(p.amount), 0)

    const propertiesByStatus = {
      available: properties.filter((p) => p.status === 'available').length,
      sold: properties.filter((p) => p.status === 'sold').length,
      rented: properties.filter((p) => p.status === 'rented').length,
      maintenance: properties.filter((p) => p.status === 'maintenance').length,
    }

    const employeeCount = employees.length
    const activeEmployees = employees.filter((e) => e.status === 'active').length

    const inventoryValue = inventoryItems.reduce(
      (sum, i) => sum + Number(i.currentStock) * Number(i.unitCost), 0
    )

    const topProjects = projects
      .map((p) => ({ name: p.name, budget: Number(p.estimatedBudget), spent: Number(p.actualCost) }))
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 5)

    const projectCosts: Record<string, { budgeted: number; spent: number }> = {}
    for (const item of budgets) {
      if (!projectCosts[item.projectId]) projectCosts[item.projectId] = { budgeted: 0, spent: 0 }
      projectCosts[item.projectId].budgeted += Number(item.budgetedAmount)
      projectCosts[item.projectId].spent += Number(item.spentAmount)
    }

    const projectProfitability = projects.map((p) => ({
      id: p.id || p.name,
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

    const now = new Date()
    const monthlyRevenue = []
    const monthsBack = range === '30d' ? 1 : range === 'quarter' ? 3 : range === 'year' ? 12 : 12
    for (let i = monthsBack - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      const monthPayments = payments.filter((p) => {
        if (p.type !== 'received') return false
        const d = new Date(p.paymentDate)
        return d >= monthDate && d <= monthEnd
      })
      monthlyRevenue.push({
        month: monthDate.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
      })
    }

    const monthlyExpenses = []
    for (let i = monthsBack - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      const monthPayments = payments.filter((p) => {
        if (p.type !== 'made') return false
        const d = new Date(p.paymentDate)
        return d >= monthDate && d <= monthEnd
      })
      monthlyExpenses.push({
        month: monthDate.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        expenses: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
      })
    }

    return Response.json({
      projectsByStatus,
      totalProjects: projects.length,
      revenue,
      expenses,
      netProfit: revenue - expenses,
      propertiesByStatus,
      totalProperties: properties.length,
      employeeCount,
      activeEmployees,
      inventoryValue,
      totalSuppliers: suppliers.length,
      totalPOs: purchaseOrders.length,
      pendingPOs: purchaseOrders.filter((p) => p.status === 'draft' || p.status === 'pending').length,
      totalSpend: purchaseOrders.reduce((sum, p) => sum + Number(p.totalAmount), 0),
      topProjects,
      monthlyRevenue,
      monthlyExpenses,
      totalRevenue: invoices.reduce((sum, i) => sum + Number(i.totalAmount), 0),
      projectProfitability,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
