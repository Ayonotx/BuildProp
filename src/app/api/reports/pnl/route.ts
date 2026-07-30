export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59)

    const transactions = await prisma.transaction.findMany({
      where: {
        date: { gte: startOfYear, lte: endOfYear },
      },
    })

    const revenue = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.totalAmount), 0)
    
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.totalAmount), 0)

    const expenseByCategory: Record<string, number> = {}
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const cat = t.category || 'Other'
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Number(t.totalAmount)
      })

    const payrollRecords = await prisma.payroll.findMany({
      where: {
        periodStart: { gte: startOfYear },
        periodEnd: { lte: endOfYear },
        status: 'paid',
      },
    })
    const payrollCost = payrollRecords.reduce((sum, p) => sum + Number(p.netPay), 0)

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: { orderDate: { gte: startOfYear, lte: endOfYear } },
      include: { items: true },
    })
    const cogs = purchaseOrders.reduce((sum, po) => {
      return sum + po.items.reduce((s, i) => s + Number(i.amount || 0), 0)
    }, 0)

    const grossProfit = revenue - cogs
    const operatingExpenses = expenses + payrollCost
    const netIncome = grossProfit - operatingExpenses

    return Response.json({
      period: `${startOfYear.toLocaleDateString('en-GB')} — ${endOfYear.toLocaleDateString('en-GB')}`,
      revenue,
      cogs,
      grossProfit,
      grossMargin: revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0,
      operatingExpenses: {
        total: operatingExpenses,
        breakdown: {
          ...expenseByCategory,
          'Payroll (Net)': payrollCost,
        },
      },
      netIncome,
      netMargin: revenue > 0 ? Math.round((netIncome / revenue) * 100) : 0,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
